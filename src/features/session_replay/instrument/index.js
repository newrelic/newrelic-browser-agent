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
import { FEATURE_NAME, SR_EVENT_EMITTER_TYPES } from '../constants'
import { setupRecordReplayAPI } from '../../../loaders/api/recordReplay'
import { setupPauseReplayAPI } from '../../../loaders/api/pauseReplay'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME

  #mode
  #agentRef
  #importAbortController

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
    }

    if (this.#canPreloadRecorder(session)) {
      this.#mode = session?.sessionReplayMode
      this.#preloadStartRecording()
    } else {
      this.#importAbortController = this.importAggregator(this.#agentRef, () => import(/* webpackChunkName: "session_replay-aggregate" */ '../aggregate'))
    }

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

  #alreadyStarted = false
  /**
   * This func is use for early pre-load recording prior to replay feature (agg) being loaded onto the page. It should only setup once, including if already called and in-progress.
   */
  async #preloadStartRecording () {
    if (this.#alreadyStarted) return
    this.#alreadyStarted = true

    try {
      const { Recorder } = (await import(/* webpackChunkName: "recorder" */'../shared/recorder'))

      // If startReplay() has been used by this point, we must record in full mode regardless of session preload:
      // Note: recorder starts here with w/e the mode is at this time, but this may be changed later (see #apiStartOrRestartReplay else-case)
      this.recorder ??= new Recorder({ ...this, mode: this.#mode, agentRef: this.#agentRef, timeKeeper: this.#agentRef.runtime.timeKeeper }) // if TK exists due to deferred state, pass it
      this.recorder.startRecording()
      this.abortHandler = this.recorder.stopRecording
    } catch (err) {
      this.parent.ee.emit('internal-error', [err])
    }
    /** cancel the original import before preloading the agg if it's already been staged */
    this.#importAbortController?.abort()
    this.importAggregator(this.#agentRef, () => import(/* webpackChunkName: "session_replay-aggregate" */ '../aggregate'), { recorder: this.recorder, errorNoticed: this.errorNoticed })
  }

  /**
   * Called whenever startReplay API is used. That could occur any time, pre or post load.
   */
  #apiStartOrRestartReplay () {
    if (this.featAggregate) { // post-load; there's possibly already an ongoing recording
      if (this.featAggregate.mode !== MODE.FULL) this.featAggregate.initializeRecording(MODE.FULL, true)
    } else { // pre-load
      this.#mode = MODE.FULL
      this.#preloadStartRecording()
      // There's a race here wherein either:
      // a. Recorder has not been initialized, and we've set the enforced mode, so we're good, or;
      // b. Record has been initialized, possibly with the "wrong" mode, so we have to correct that + restart.
      if (this.recorder && this.recorder.parent.mode !== MODE.FULL) {
        this.recorder.parent.mode = MODE.FULL
        this.recorder.stopRecording()
        this.recorder.startRecording()
        this.abortHandler = this.recorder.stopRecording
      }
    }
  }
}

export const SessionReplay = Instrument
