/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
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
import { SESSION_EVENT_TYPES, SESSION_EVENTS } from '../../../common/session/constants'
import { ABORT_REASONS } from '../../session_replay/constants'
import { canEnableSessionTracking } from '../../utils/feature-gates'
import { getVersion2Attributes } from '../../../common/util/mfe'

const LOGGING_EVENT = 'Logging/Event/'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)
    const updateLocalLoggingMode = (auto, api) => {
      this.loggingMode = {
        auto,
        api
      }
      // In agent v1.290.0 & under, the logApiMode prop did not yet exist, so need to account for old session state being in-use.
      if (api === undefined) this.loggingMode.api = auto
    }

    /** set up agg-level behaviors specific to this feature */
    this.harvestOpts.raw = true
    super.customAttributesAreSeparate = true

    // The SessionEntity class can emit a message indicating the session was cleared and reset (expiry, inactivity). This feature must abort and never resume if that occurs.
    this.ee.on(SESSION_EVENTS.RESET, () => {
      this.abort(ABORT_REASONS.RESET)
    })
    this.ee.on(SESSION_EVENTS.UPDATE, (type, data) => {
      if (this.blocked) return
      if (type !== SESSION_EVENT_TYPES.CROSS_TAB) {
        console.log(agentRef.agentIdentifier + type + ' - logging feature, this.loggingMode:', this.loggingMode, 'data.loggingMode:', data.loggingMode)
        window.foo.push(agentRef.agentIdentifier + type + ' - logging feature, this.loggingMode: ' + this.loggingMode + ', data.loggingMode: ' + data.loggingMode)
        // this.loggingMode = data.loggingMode
        return
      }
      console.log(agentRef.agentIdentifier + ' CROSS TAB - logging feature, this.loggingMode:', this.loggingMode, 'data.loggingMode:', data.loggingMode)
      window.foo.push(agentRef.agentIdentifier + ' CROSS TAB - logging feature, this.loggingMode: ' + this.loggingMode + ', data.loggingMode: ' + data.loggingMode)
      // In agent v1.290.0 & under, the logApiMode prop did not yet exist, so need to account for old session state being in-use with just loggingMode off == feature off.
      if (data.loggingMode === LOGGING_MODE.OFF && (!data.logApiMode || data.logApiMode === LOGGING_MODE.OFF)) this.abort(ABORT_REASONS.CROSS_TAB)
      else updateLocalLoggingMode(data.loggingMode, data.logApiMode)
    })

    this.waitForFlags(['log', 'logapi']).then(([auto, api]) => {
      if (this.blocked) return // means abort already happened before this, likely from session reset or update; abort would've set mode off + deregistered drain

      console.log(agentRef.agentIdentifier + ' - Setting local logging mode ', { auto, api })
      window.foo.push(agentRef.agentIdentifier + ' - Setting local logging mode ' + JSON.stringify({ auto, api }))
      this.loggingMode ??= { auto, api } // likewise, don't want to overwrite the mode if it was set already

      const session = this.agentRef.runtime.session
      console.log(agentRef.agentIdentifier + ' - session? ', stringify(session))
      console.log(agentRef.agentIdentifier + ' - session.isNew? ', session.isNew)
      console.log(agentRef.agentIdentifier + ' - session.state ', {
        loggingMode: session.state.loggingMode,
        logApiMode: session.state.logApiMode
      })
      window.foo.push(agentRef.agentIdentifier + ' - session.isNew? ' + session.isNew)
      window.foo.push(agentRef.agentIdentifier + ' - session.state.loggingMode ' + JSON.stringify({
        loggingMode: session.state.loggingMode,
        logApiMode: session.state.logApiMode
      }))
      if (canEnableSessionTracking(agentRef.init) && session) {
        if (session.isNew) {
          this.#syncWithSessionManager()
        } else {
          updateLocalLoggingMode(session.state.loggingMode, session.state.logApiMode)
        // } else {
        //   let retries = 0
        //   waitForSessionInit.call(this)
        //
        //   function waitForSessionInit () {
        //     //  We know this is not a new session, and there's a chance another agent was first so read the latest session state from local storage
        //     const currentState = session.read()
        //     console.log(agentRef.agentIdentifier + ' - reading logging mode from session: ', currentState.loggingMode)
        //     if (currentState.loggingMode !== LOGGING_MODE.NOT_SET) {
        //       updateLocalLoggingMode(currentState.loggingMode, currentState.logApiMode)
        //       this.#completeInitialization()
        //     } else if (retries < 5) {
        //       // if the value is still not set yet, wait a bit and try again
        //       retries++
        //       setTimeout(waitForSessionInit, 10)
        //     } else {
        //       console.log('Give up after waiting 50 ms for localStorage update')
        //     }
        //   }
        }
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

  // #completeInitialization () {
  //   if (this.loggingMode.auto <= LOGGING_MODE.OFF && this.loggingMode.api <= LOGGING_MODE.OFF) {
  //     console.log(this.agentRef.agentIdentifier + ' - Setting to blocked, shutting down logging feature')
  //     window.foo.push(this.agentRef.agentIdentifier + ' - Setting to blocked, shutting down logging feature')
  //     this.blocked = true
  //     this.deregisterDrain()
  //     return
  //   }
  //
  //   /** emitted by instrument class (wrapped loggers) or the api methods directly */
  //   registerHandler(LOGGING_EVENT_EMITTER_CHANNEL, this.handleLog.bind(this), this.featureName, this.ee)
  //   this.drain()
  //   /** harvest immediately once started to purge pre-load logs collected */
  //   this.agentRef.runtime.harvester.triggerHarvestFor(this)
  // }

  handleLog (timestamp, message, attributes = {}, level = LOG_LEVELS.INFO, autoCaptured, target) {
    if (this.blocked) return
    // Check respective logging mode depending on whether this log is from auto wrapped instrumentation or manual API that it's not turned off.
    const modeForThisLog = autoCaptured ? this.loggingMode.auto : this.loggingMode.api
    if (!modeForThisLog) return

    if (!attributes || typeof attributes !== 'object') attributes = {}

    attributes = {
      ...attributes,
      /** Specific attributes only supplied if harvesting to endpoint version 2 */
      ...(getVersion2Attributes(target, this))
    }

    if (typeof level === 'string') level = level.toUpperCase()
    if (!isValidLogLevel(level)) return warn(30, level)
    if (modeForThisLog < (LOGGING_MODE[level] || Infinity)) {
      this.reportSupportabilityMetric(LOGGING_EVENT + 'Dropped/Sampling')
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
      this.reportSupportabilityMetric(LOGGING_EVENT + 'Dropped/Casting')
      return
    }
    if (typeof message !== 'string' || !message) return warn(32)

    const log = new Log(
      Math.floor(this.agentRef.runtime.timeKeeper.correctRelativeTimestamp(timestamp)),
      message,
      attributes,
      level
    )

    if (this.events.add(log)) this.reportSupportabilityMetric(LOGGING_EVENT + (autoCaptured ? 'Auto' : 'API') + '/Added')
  }

  serializer (eventBuffer) {
    const sessionEntity = this.agentRef.runtime.session
    return [{
      common: {
        /** Attributes in the `common` section are added to `all` logs generated in the payload */
        attributes: {
          ...(applyFnToProps(this.agentRef.info.jsAttributes, this.obfuscator.obfuscateString.bind(this.obfuscator), 'string')),
          ...(this.harvestEndpointVersion === 1 && {
            'entity.guid': this.agentRef.runtime.appMetadata.agents[0].entityGuid,
            appId: this.agentRef.info.applicationID
          }),
          ...(sessionEntity && {
            session: sessionEntity.state.value || '0', // The session ID that we generate and keep across page loads
            hasReplay: sessionEntity.state.sessionReplayMode === 1, // True if a session replay recording is running
            hasTrace: sessionEntity.state.sessionTraceMode === 1 // True if a session trace recording is running
          }),
          ptid: this.agentRef.runtime.ptid, // page trace id
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

  queryStringsBuilder () {
    return { browser_monitoring_key: this.agentRef.info.licenseKey }
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
    console.log(this.agentRef.agentIdentifier + ' - Writing logging mode to session: ', this.loggingMode)
    window.foo.push(this.agentRef.agentIdentifier + ' - Writing logging mode to session: ' + JSON.stringify(this.loggingMode))
    this.agentRef.runtime.session?.write({
      loggingMode: this.loggingMode.auto,
      logApiMode: this.loggingMode.api
    })
  }
}
