import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { handle } from '../../../common/event-emitter/handle'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { warn } from '../../../common/util/console'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME, LOGGING_EVENT_EMITTER_TYPES, MAX_PAYLOAD_SIZE } from '../constants'
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

    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'logging.harvestTimeSeconds') || 10

    this.waitForFlags([]).then(() => {
      this.scheduler = new HarvestScheduler('browser/logs', {
        onFinished: this.onHarvestFinished.bind(this),
        retryDelay: this.harvestTimeSeconds,
        getPayload: this.prepareHarvest.bind(this),
        raw: true
      }, this)
      this.scheduler.startTimer(this.harvestTimeSeconds)
      /** emitted by instrument class (wrapped loggers) or the api methods directly */
      registerHandler(LOGGING_EVENT_EMITTER_TYPES.LOG, this.handleLog.bind(this), this.featureName, this.ee)
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
    const logBytes = log.message.length + log.attributes.length + log.logType.length + log.session.url.length + 10 // timestamp == 10 chars
    if (logBytes > MAX_PAYLOAD_SIZE) {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['Logging/Harvest/Failed/Seen'])
      return warn(`failed to log: > ${MAX_PAYLOAD_SIZE} bytes`, log.message.slice(0, 25) + '...')
    }

    if (this.estimatedBytes + logBytes >= MAX_PAYLOAD_SIZE) {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['Logging/Harvest/Early/Seen'])
      this.scheduler.runHarvest({})
    }
    this.estimatedBytes += logBytes
    this.bufferedLogs.push(log)
  }

  prepareHarvest () {
    if (this.blocked || !(this.bufferedLogs.length || this.outgoingLogs.length)) return
    this.outgoingLogs.push(...this.bufferedLogs.splice(0))
    this.estimatedBytes = 0
    return {
      qs: {
        browser_monitoring_key: this.#agentInfo.licenseKey
      },
      body: {
        common: {
          attributes: {
            entityGuid: (this.#agentRuntime.appMetadata?.agents?.[0] || {}).entityGuid,
            session: {
              id: this.#agentRuntime?.session?.state.value || '0', // The session ID that we generate and keep across page loads
              hasReplay: this.#agentRuntime?.session?.state.sessionReplayMode === 1, // True if a session replay recording is running
              hasTrace: this.#agentRuntime?.session?.state.sessionTraceMode === 1, // True if a session trace recording is running
              pageTraceId: this.#agentRuntime.ptid // The trace ID if a session trace is recording
            },
            agent: {
              appId: this.#agentInfo.applicationID, // Application ID from info object
              standalone: this.#agentInfo.sa, // Whether the app is C+P or APM injected
              version: this.#agentRuntime.version, // the browser agent version
              distribution: this.#agentRuntime.distMethod // How is the agent being loaded on the page
            }
          }
        },
        logs: this.outgoingLogs
      }
    }
  }

  onHarvestFinished (result) {
    if (result.sent && !result.retry) this.outgoingLogs = []
  }

  abort () {
    this.blocked = true
    this.scheduler.stopTimer()
  }
}
