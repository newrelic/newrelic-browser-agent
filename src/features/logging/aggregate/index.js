import { getInfo, getRuntime } from '../../../common/config/config'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME, LOGGING_EVENT_EMITTER_CHANNEL } from '../constants'
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

    this.#agentRuntime = getRuntime(this.agentIdentifier)
    this.#agentInfo = getInfo(this.agentIdentifier)

    this.waitForFlags([]).then(() => {
      /** emitted by instrument class (wrapped loggers) or the api methods directly */
      registerHandler(LOGGING_EVENT_EMITTER_CHANNEL, this.handleLog.bind(this), this.featureName, this.ee)
      this.drain()
    })
  }

  handleLog (timestamp, message, attributes, level) {
    this.bufferedLogs.push(
      new Log(
        this.#agentRuntime.timeKeeper.convertRelativeTimestamp(timestamp),
        message,
        attributes,
        level
      )
    )
  }

  preparePayload () {
    this.outgoingLogs.push(...this.bufferedLogs.splice(0))
    return {
      common: {
        attributes: {
          entityGuid: this.#agentRuntime.appMetadata?.agents?.[0]?.entityGuid,
          session: {
            id: this.#agentRuntime?.session?.state.value || '0', // The session ID that we generate and keep across page loads
            hasReplay: this.#agentRuntime?.session?.state.sessionReplayMode === 1, // True if a session replay recording is running
            hasTrace: this.#agentRuntime?.session?.state.sessionTraceMode === 1, // True if a session trace recording is running
            pageTraceId: this.#agentRuntime.ptid // The page's trace ID (equiv to agent id)
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
