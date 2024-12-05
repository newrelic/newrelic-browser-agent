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
import { FEATURE_TO_ENDPOINT } from '../../../loaders/features/features'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)
    this.harvestTimeSeconds = agentRef.init.logging.harvestTimeSeconds

    this.waitForFlags([]).then(() => {
      this.scheduler = new HarvestScheduler(FEATURE_TO_ENDPOINT[this.featureName], {
        onFinished: (result) => this.postHarvestCleanup(result.sent && result.retry),
        retryDelay: this.harvestTimeSeconds,
        getPayload: (options) => this.makeHarvestPayload(options.retry),
        raw: true
      }, this)
      /** emitted by instrument class (wrapped loggers) or the api methods directly */
      registerHandler(LOGGING_EVENT_EMITTER_CHANNEL, this.handleLog.bind(this), this.featureName, this.ee)
      this.drain()
      /** harvest immediately once started to purge pre-load logs collected */
      this.scheduler.startTimer(this.harvestTimeSeconds, 0)
    })
  }

  handleLog (timestamp, message, attributes = {}, level = LOG_LEVELS.INFO, target) {
    if (target && !target.entityGuid) return warn(47)
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
      Math.floor(this.agentRef.runtime.timeKeeper.correctRelativeTimestamp(timestamp)),
      message,
      attributes,
      level
    )
    const logBytes = log.message.length + stringify(log.attributes).length + log.level.length + 10 // timestamp == 10 chars

    const failToHarvestMessage = 'Logging/Harvest/Failed/Seen'
    if (logBytes > MAX_PAYLOAD_SIZE) { // cannot possibly send this, even with an empty buffer
      handle(SUPPORTABILITY_METRIC_CHANNEL, [failToHarvestMessage, logBytes])
      warn(31, log.message.slice(0, 25) + '...')
      return
    }

    const events = this.eventManager.get(target)

    if (events.wouldExceedMaxSize(logBytes)) {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['Logging/Harvest/Early/Seen', events.bytes + logBytes])
      this.scheduler.runHarvest() // force a harvest to try adding again
    }

    if (!events.add(log)) { // still failed after a harvest attempt despite not being too large would mean harvest failed with options.retry
      handle(SUPPORTABILITY_METRIC_CHANNEL, [failToHarvestMessage, logBytes])
      warn(31, log.message.slice(0, 25) + '...')
    }
  }

  serializer (eventBuffer, target) {
    const sessionEntity = this.agentRef.runtime.session
    return [{
      common: {
        /** Attributes in the `common` section are added to `all` logs generated in the payload */
        attributes: {
          'entity.guid': target.entityGuid || this.agentRef.runtime.appMetadata?.agents?.[0]?.entityGuid, // browser entity guid as provided API target OR the default from RUM response if not supplied
          ...(sessionEntity && {
            session: sessionEntity.state.value || '0', // The session ID that we generate and keep across page loads
            hasReplay: sessionEntity.state.sessionReplayMode === 1, // True if a session replay recording is running
            hasTrace: sessionEntity.state.sessionTraceMode === 1 // True if a session trace recording is running
          }),
          ptid: this.agentRef.runtime.ptid, // page trace id
          appId: target.applicationID || this.agentRef.info.applicationID, // Application ID from info object,
          standalone: Boolean(this.agentRef.info.sa), // copy paste (true) vs APM (false)
          agentVersion: this.agentRef.runtime.version, // browser agent version
          // The following 3 attributes are evaluated and dropped at ingest processing time and do not get stored on NRDB:
          'instrumentation.provider': 'browser',
          'instrumentation.version': this.agentRef.runtime.version,
          'instrumentation.name': this.agentRef.runtime.loaderType
        }
      },
      /** logs section contains individual unique log entries */
      logs: applyFnToProps(
        eventBuffer,
        this.obfuscator.obfuscateString.bind(this.obfuscator), 'string'
      )
    }]
  }

  queryStringsBuilder (_, target) {
    return { browser_monitoring_key: target.licenseKey }
  }
}
