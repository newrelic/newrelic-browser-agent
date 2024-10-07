import { getInfo } from '../../../common/config/info'
import { getConfigurationValue } from '../../../common/config/init'
import { getRuntime } from '../../../common/config/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { warn } from '../../../common/util/console'
import { stringify } from '../../../common/util/stringify'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME, LOGGING_EVENT_EMITTER_CHANNEL, LOG_LEVELS } from '../constants'
import { Log } from '../shared/log'
import { isValidLogLevel } from '../shared/utils'
import { applyFnToProps } from '../../../common/util/traverse'
import { MAX_PAYLOAD_SIZE } from '../../../common/constants/agent-constants'
import { EventBuffer } from '../../utils/event-buffer'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  #agentRuntime
  #agentInfo
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    /** held logs before sending */
    this.bufferedLogs = new EventBuffer()

    this.#agentRuntime = getRuntime(this.agentIdentifier)
    this.#agentInfo = getInfo(this.agentIdentifier)

    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'logging.harvestTimeSeconds')

    this.waitForFlags([]).then(() => {
      this.scheduler = new HarvestScheduler('browser/logs', {
        onFinished: this.onHarvestFinished.bind(this),
        retryDelay: this.harvestTimeSeconds,
        getPayload: this.prepareHarvest.bind(this),
        raw: true
      }, this)
      /** emitted by instrument class (wrapped loggers) or the api methods directly */
      registerHandler(LOGGING_EVENT_EMITTER_CHANNEL, this.handleLog.bind(this), this.featureName, this.ee)
      this.drain()
      /** harvest immediately once started to purge pre-load logs collected */
      this.scheduler.startTimer(this.harvestTimeSeconds, 0)
    })
  }

  handleLog (timestamp, message, attributes = {}, level = LOG_LEVELS.INFO) {
    if (this.blocked) return

    if (!attributes || typeof attributes !== 'object') attributes = {}
    if (typeof level === 'string') level = level.toUpperCase()
    if (!isValidLogLevel(level)) return warn(30, level)

    try {
      if (typeof message !== 'string') {
        const stringified = stringify(message)
        /**
           * Error instances convert to `{}` when stringified
           * Symbol converts to '' when stringified
           * other cases tbd
           * */
        if (!!stringified && stringified !== '{}') message = stringified
        else message = String(message)
      }
    } catch (err) {
      warn(16, message)
      return
    }
    if (typeof message !== 'string' || !message) return warn(32)

    const log = new Log(
      Math.floor(this.#agentRuntime.timeKeeper.correctRelativeTimestamp(timestamp)),
      message,
      attributes,
      level
    )
    const logBytes = log.message.length + stringify(log.attributes).length + log.level.length + 10 // timestamp == 10 chars

    if (!this.bufferedLogs.canMerge(logBytes)) {
      if (this.bufferedLogs.hasData) {
        handle(SUPPORTABILITY_METRIC_CHANNEL, ['Logging/Harvest/Early/Seen', this.bufferedLogs.bytes + logBytes])
        this.scheduler.runHarvest({})
        if (logBytes < MAX_PAYLOAD_SIZE) this.bufferedLogs.add(log)
      } else {
        handle(SUPPORTABILITY_METRIC_CHANNEL, ['Logging/Harvest/Failed/Seen', logBytes])
        warn(31, log.message.slice(0, 25) + '...')
      }
      return
    }

    this.bufferedLogs.add(log)
  }

  prepareHarvest (options = {}) {
    if (this.blocked || !this.bufferedLogs.hasData) return
    /** These attributes are evaluated and dropped at ingest processing time and do not get stored on NRDB */
    const unbilledAttributes = {
      'instrumentation.provider': 'browser',
      'instrumentation.version': this.#agentRuntime.version,
      'instrumentation.name': this.#agentRuntime.loaderType
    }
    /** see https://source.datanerd.us/agents/rum-specs/blob/main/browser/Log for logging spec */
    const payload = {
      qs: {
        browser_monitoring_key: this.#agentInfo.licenseKey
      },
      body: [{
        common: {
          /** Attributes in the `common` section are added to `all` logs generated in the payload */
          attributes: {
            'entity.guid': this.#agentRuntime.appMetadata?.agents?.[0]?.entityGuid, // browser entity guid as provided from RUM response
            session: this.#agentRuntime?.session?.state.value || '0', // The session ID that we generate and keep across page loads
            hasReplay: this.#agentRuntime?.session?.state.sessionReplayMode === 1, // True if a session replay recording is running
            hasTrace: this.#agentRuntime?.session?.state.sessionTraceMode === 1, // True if a session trace recording is running
            ptid: this.#agentRuntime.ptid, // page trace id
            appId: this.#agentInfo.applicationID, // Application ID from info object,
            standalone: Boolean(this.#agentInfo.sa), // copy paste (true) vs APM (false)
            agentVersion: this.#agentRuntime.version, // browser agent version,
            ...unbilledAttributes
          }
        },
        /** logs section contains individual unique log entries */
        logs: applyFnToProps(
          this.bufferedLogs.buffer,
          this.obfuscator.obfuscateString.bind(this.obfuscator), 'string'
        )
      }]
    }

    if (options.retry) this.bufferedLogs.hold()
    else this.bufferedLogs.clear()

    return payload
  }

  onHarvestFinished (result) {
    if (result.retry) this.bufferedLogs.unhold()
    else this.bufferedLogs.held.clear()
  }
}
