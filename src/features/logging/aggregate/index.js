/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { warn } from '../../../common/util/console'
import { stringify } from '../../../common/util/stringify'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME, LOGGING_EVENT_EMITTER_CHANNEL, LOG_LEVELS, LOGGING_MODE } from '../constants'
import { Log } from '../shared/log'
import { isValidLogLevel } from '../shared/utils'
import { applyFnToProps } from '../../../common/util/traverse'
import { isContainerAgentTarget } from '../../../common/util/target'
import { SESSION_EVENT_TYPES, SESSION_EVENTS } from '../../../common/session/constants'
import { ABORT_REASONS } from '../../session_replay/constants'
import { canEnableSessionTracking } from '../../utils/feature-gates'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)
    const updateLocalLoggingMode = (auto, api) => {
      this.loggingMode = { auto, api }
      // In agent v1.290.0 & under, the logApiMode prop did not yet exist, so need to account for old session state being in-use.
      if (api === undefined) this.loggingMode.api = auto
    }

    super.customAttributesAreSeparate = true

    // The SessionEntity class can emit a message indicating the session was cleared and reset (expiry, inactivity). This feature must abort and never resume if that occurs.
    this.ee.on(SESSION_EVENTS.RESET, () => {
      this.abort(ABORT_REASONS.RESET)
    })
    this.ee.on(SESSION_EVENTS.UPDATE, (type, data) => {
      if (this.blocked || type !== SESSION_EVENT_TYPES.CROSS_TAB) return
      // In agent v1.290.0 & under, the logApiMode prop did not yet exist, so need to account for old session state being in-use with just loggingMode off == feature off.
      if (data.loggingMode === LOGGING_MODE.OFF && (!data.logApiMode || data.logApiMode === LOGGING_MODE.OFF)) this.abort(ABORT_REASONS.CROSS_TAB)
      else updateLocalLoggingMode(data.loggingMode, data.logApiMode)
    })

    this.harvestOpts.raw = true
    this.waitForFlags(['log', 'logapi']).then(([auto, api]) => {
      if (this.blocked) return // means abort already happened before this, likely from session reset or update; abort would've set mode off + deregistered drain

      this.loggingMode ??= { auto, api } // likewise, don't want to overwrite the mode if it was set already
      const session = this.agentRef.runtime.session
      if (canEnableSessionTracking(agentRef.init) && session) {
        if (session.isNew) this.#syncWithSessionManager()
        else updateLocalLoggingMode(session.state.loggingMode, session.state.logApiMode)
      }
      if (this.loggingMode.auto === LOGGING_MODE.OFF && this.loggingMode.api === LOGGING_MODE.OFF) {
        this.blocked = true
        this.deregisterDrain()
        return
      }

      /** emitted by instrument class (wrapped loggers) or the api methods directly */
      registerHandler(LOGGING_EVENT_EMITTER_CHANNEL, this.handleLog.bind(this), this.featureName, this.ee)
      this.drain()
      /** harvest immediately once started to purge pre-load logs collected */
      agentRef.runtime.harvester.triggerHarvestFor(this)
    })
  }

  handleLog (timestamp, message, attributes = {}, level = LOG_LEVELS.INFO, autoCaptured, targetEntityGuid) {
    if (!this.agentRef.runtime.entityManager.get(targetEntityGuid)) return warn(56, this.featureName)
    if (this.blocked) return
    // Check respective logging mode depending on whether this log is from auto wrapped instrumentation or manual API that it's not turned off.
    const modeForThisLog = autoCaptured ? this.loggingMode.auto : this.loggingMode.api
    if (!modeForThisLog) return

    if (!attributes || typeof attributes !== 'object') attributes = {}
    if (typeof level === 'string') level = level.toUpperCase()
    if (!isValidLogLevel(level)) return warn(30, level)
    if (modeForThisLog < (LOGGING_MODE[level] || Infinity)) {
      this.reportSupportabilityMetric('Logging/Event/Dropped/Sampling')
      return
    }

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
      this.reportSupportabilityMetric('Logging/Event/Dropped/Casting')
      return
    }
    if (typeof message !== 'string' || !message) return warn(32)

    const log = new Log(
      Math.floor(this.agentRef.runtime.timeKeeper.correctRelativeTimestamp(timestamp)),
      message,
      attributes,
      level
    )

    this.events.add(log, targetEntityGuid)
  }

  serializer (eventBuffer, targetEntityGuid) {
    const target = this.agentRef.runtime.entityManager.get(targetEntityGuid)
    const sessionEntity = this.agentRef.runtime.session
    return [{
      common: {
        /** Attributes in the `common` section are added to `all` logs generated in the payload */
        attributes: {
          'entity.guid': target.entityGuid, // browser entity guid as provided API target OR the default from RUM response if not supplied
          ...(sessionEntity && {
            session: sessionEntity.state.value || '0', // The session ID that we generate and keep across page loads
            hasReplay: sessionEntity.state.sessionReplayMode === 1 && isContainerAgentTarget(target, this.agentRef), // True if a session replay recording is running
            hasTrace: sessionEntity.state.sessionTraceMode === 1 // True if a session trace recording is running
          }),
          ptid: this.agentRef.runtime.ptid, // page trace id
          appId: target.applicationID || this.agentRef.info.applicationID, // Application ID from info object,
          standalone: Boolean(this.agentRef.info.sa), // copy paste (true) vs APM (false)
          agentVersion: this.agentRef.runtime.version, // browser agent version
          // The following 3 attributes are evaluated and dropped at ingest processing time and do not get stored on NRDB:
          'instrumentation.provider': 'browser',
          'instrumentation.version': this.agentRef.runtime.version,
          'instrumentation.name': this.agentRef.runtime.loaderType,
          // Custom attributes
          ...this.agentRef.info.jsAttributes
        }
      },
      /** logs section contains individual unique log entries */
      logs: applyFnToProps(
        eventBuffer,
        this.obfuscator.obfuscateString.bind(this.obfuscator), 'string'
      )
    }]
  }

  queryStringsBuilder (_, targetEntityGuid) {
    const target = this.agentRef.runtime.entityManager.get(targetEntityGuid)
    return { browser_monitoring_key: target.licenseKey }
  }

  /** Abort the feature, once aborted it will not resume */
  abort (reason = {}) {
    this.reportSupportabilityMetric(`Logging/Abort/${reason.sm}`)
    this.blocked = true
    if (this.events) {
      this.events.clear()
      this.events.clearSave()
    }
    this.loggingMode = {
      auto: LOGGING_MODE.OFF,
      api: LOGGING_MODE.OFF
    }
    this.#syncWithSessionManager()
    this.deregisterDrain()
  }

  #syncWithSessionManager () {
    this.agentRef.runtime.session?.write({
      loggingMode: this.loggingMode.auto,
      logApiMode: this.loggingMode.api
    })
  }
}
