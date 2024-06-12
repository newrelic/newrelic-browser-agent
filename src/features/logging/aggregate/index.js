import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { handle } from '../../../common/event-emitter/handle'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { warn } from '../../../common/util/console'
import { stringify } from '../../../common/util/stringify'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME, LOGGING_EVENT_EMITTER_CHANNEL, LOGGING_IGNORED, MAX_PAYLOAD_SIZE } from '../constants'
import { Log } from '../shared/log'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  #agentRuntime
  #agentInfo
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    /** held logs before sending */
    this.bufferedLogs = []
    /** held logs during sending, for retries */
    this.outgoingLogs = []
    /** the estimated bytes of log data waiting to be sent -- triggers a harvest if adding a new log will exceed limit  */
    this.estimatedBytes = 0

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
      /** harvest immediately once started to purge pre-load logs collected */
      this.scheduler.startTimer(this.harvestTimeSeconds, 0)
      /** emitted by instrument class (wrapped loggers) or the api methods directly */
      registerHandler(LOGGING_EVENT_EMITTER_CHANNEL, this.handleLog.bind(this), this.featureName, this.ee)
      this.drain()
    })
  }

  handleLog (timestamp, message, attributes, level) {
    if (this.blocked) return
    const log = new Log(
      this.#agentRuntime.timeKeeper.convertRelativeTimestamp(timestamp),
      message,
      attributes,
      level
    )
    const logBytes = log.message.length + stringify(log.attributes).length + log.logType.length + 10 // timestamp == 10 chars
    if (logBytes > MAX_PAYLOAD_SIZE) {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['Logging/Harvest/Failed/Seen', logBytes])
      return warn(LOGGING_IGNORED + '> ' + MAX_PAYLOAD_SIZE + ' bytes', log.message.slice(0, 25) + '...')
    }

    if (this.estimatedBytes + logBytes >= MAX_PAYLOAD_SIZE) {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['Logging/Harvest/Early/Seen', this.estimatedBytes + logBytes])
      this.scheduler.runHarvest({})
    }
    this.estimatedBytes += logBytes
    this.bufferedLogs.push(log)
  }

  prepareHarvest () {
    if (this.blocked || !(this.bufferedLogs.length || this.outgoingLogs.length)) return
    /** populate outgoing array while also clearing main buffer */
    this.outgoingLogs.push(...this.bufferedLogs.splice(0))
    this.estimatedBytes = 0
    /** see https://source.datanerd.us/agents/rum-specs/blob/main/browser/Log for logging spec */
    return {
      qs: {
        browser_monitoring_key: this.#agentInfo.licenseKey
      },
      body: {
        common: {
          /** Attributes in the `common` section are added to `all` logs generated in the payload */
          attributes: {
            entityGuid: this.#agentRuntime.appMetadata?.agents?.[0]?.entityGuid, // browser entity guid as provided from RUM response
            session: this.#agentRuntime?.session?.state.value || '0', // The session ID that we generate and keep across page loads
            hasReplay: this.#agentRuntime?.session?.state.sessionReplayMode === 1, // True if a session replay recording is running
            hasTrace: this.#agentRuntime?.session?.state.sessionTraceMode === 1, // True if a session trace recording is running
            ptid: this.#agentRuntime.ptid, // page trace id
            appId: this.#agentInfo.applicationID, // Application ID from info object,
            standalone: Boolean(this.#agentInfo.sa), // copy paste (true) vs APM (false)
            agentVersion: this.#agentRuntime.version // browser agent version
          }
        },
        /** logs section contains individual unique log entries */
        logs: this.outgoingLogs
      }
    }
  }

  onHarvestFinished (result) {
    if (!result.retry) this.outgoingLogs = []
  }

  abort () {
    this.blocked = true
    this.scheduler.stopTimer()
  }
}
