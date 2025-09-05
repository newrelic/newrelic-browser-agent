/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Primes the Session Replay feature for lazy loading.
 */

import { handle } from '../../../common/event-emitter/handle'
import { DEFAULT_KEY, MODE, PREFIX } from '../../../common/session/constants'
import { InstrumentBase } from '../../utils/instrument-base'
import { hasReplayPrerequisite, isPreloadAllowed } from '../shared/utils'
import { FEATURE_NAME, SR_EVENT_EMITTER_TYPES, TRIGGERS } from '../constants'
import { setupRecordReplayAPI } from '../../../loaders/api/recordReplay'
import { setupPauseReplayAPI } from '../../../loaders/api/pauseReplay'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME

  #agentRef

  /** a promise either resolving immediately, or resolving when the staged import of the recorder module downloads */
  #stagedImport = Promise.resolve()

  /** The RRWEB recorder instance, if imported */
  recorder

  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    /** feature specific APIs */
    setupRecordReplayAPI(agentRef)
    setupPauseReplayAPI(agentRef)

    let session
    this.#agentRef = agentRef
    try {
      session = JSON.parse(localStorage.getItem(`${PREFIX}_${DEFAULT_KEY}`))
    } catch (err) { }

    if (hasReplayPrerequisite(agentRef.init)) {
      this.ee.on(SR_EVENT_EMITTER_TYPES.RECORD, () => this.#apiStartOrRestartReplay())
      this.ee.on('session-error', () => { handle(SR_EVENT_EMITTER_TYPES.SESSION_ERROR, [], undefined, this.featureName, this.ee) })
    }

    if (this.canPreloadRecorder(session)) {
      this.importRecorder().then(() => {
        this.recorder.startRecording(TRIGGERS.PRELOAD, session?.sessionReplayMode)
      })
    }

    this.importAggregator(this.#agentRef, () => import(/* webpackChunkName: "session_replay-aggregate" */ '../aggregate'), this)

    /** If the recorder is running, we can pass error events on to the agg to help it switch to full mode later */
    this.ee.on('err', (e) => {
      if (this.#agentRef.runtime.isRecording) {
        this.errorNoticed = true
        handle(SR_EVENT_EMITTER_TYPES.ERROR_DURING_REPLAY, [e], undefined, this.featureName, this.ee)
      }
    })
  }

  // At this point wherein session state exists already but we haven't init SessionEntity aka verify timers.
  #canPreloadRecorder (session) {
    if (!session) { // this might be a new session if entity initializes: conservatively start recording if first-time config allows
      // Note: users with SR enabled, as well as these other configs enabled by-default, will be penalized by the recorder overhead EVEN IF they don't actually have or get
      // entitlement or sampling decision, or otherwise intentionally opted-in for the feature.
      return isPreloadAllowed(this.#agentRef.init)
    } else if (session.sessionReplayMode === MODE.FULL || session.sessionReplayMode === MODE.ERROR) {
      return true // existing sessions get to continue recording, regardless of this page's configs or if it has expired (conservatively)
    } else { // SR mode was OFF but may potentially be turned on if session resets and configs allows the new session to have replay...
      return isPreloadAllowed(this.#agentRef.init)
    }
  }

  /**
   * Imports the recorder module.  Returns the existing instance if already imported. Only ever allows a single download to occur.
   * @param {string} [trigger] a reason that import recorder was called
   * @returns {Recorder}
   */
  async importRecorder () {
    /** if the import has never been staged, it will just resolve immediately.
     * Once it has, it will be assigned as the actual import promise.
     * This is to prevent multiple imports from being triggered before the previous has had a chance to resolve */
    await this.#stagedImport
    /** if the recorder has already been imported, return it */
    if (this.recorder) return this.recorder

    try {
      this.#stagedImport = import(/* webpackChunkName: "recorder" */'../shared/recorder')
      const { Recorder } = await this.#stagedImport

      // If startReplay() has been used by this point, we must record in full mode regardless of session preload:
      // Note: recorder starts here with w/e the mode is at this time, but this may be changed later (see #apiStartOrRestartReplay else-case)
      this.recorder = new Recorder(this) // if TK exists due to deferred state, pass it
    } catch (err) {
      this.ee.emit('internal-error', [err])
    }

    return this.recorder
  }

  /**
   * Called whenever startReplay API is used. That could occur any time, pre or post load.
   */
  async #apiStartOrRestartReplay () {
    if (this.featAggregate) { // post-load; there's possibly already an ongoing recording
      if (this.featAggregate.mode !== MODE.FULL) this.featAggregate.initializeRecording(MODE.FULL, true)
    } else {
      await this.importRecorder()
      this.recorder.startRecording(TRIGGERS.API, MODE.FULL)
    }
  }
}

export const SessionReplay = Instrument
