/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Primes the Session Replay feature for lazy loading.
 */

import { handle } from '../../../common/event-emitter/handle'
import { DEFAULT_KEY, MODE, PREFIX } from '../../../common/session/constants'
import { InstrumentBase } from '../../utils/instrument-base'
import { hasReplayPrerequisite, isPreloadAllowed } from '../shared/utils'
import { ERROR_DURING_REPLAY, FEATURE_NAME, TRIGGERS } from '../constants'
import { setupRecordReplayAPI } from '../../../loaders/api/recordReplay'
import { setupPauseReplayAPI } from '../../../loaders/api/pauseReplay'
import { RECORD_REPLAY } from '../../../loaders/api/constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  /** @type {Promise|undefined} A promise that resolves when the recorder module is imported and added to the class. Undefined if the recorder has never been staged to import with `importRecorder`. */
  #stagedImport
  /** The RRWEB recorder instance, if imported */
  recorder

  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    /** feature specific APIs */
    setupRecordReplayAPI(agentRef)
    setupPauseReplayAPI(agentRef)

    let session
    try {
      session = JSON.parse(localStorage.getItem(`${PREFIX}_${DEFAULT_KEY}`))
    } catch (err) { }

    if (hasReplayPrerequisite(agentRef.init)) {
      this.ee.on(RECORD_REPLAY, () => this.#apiStartOrRestartReplay())
    }

    if (this.#canPreloadRecorder(session)) {
      this.importRecorder().then(recorder => {
        recorder.startRecording(TRIGGERS.PRELOAD, session?.sessionReplayMode)
      }) // could handle specific fail-state behaviors with a .catch block here
    }

    this.importAggregator(this.agentRef, () => import(/* webpackChunkName: "session_replay-aggregate" */ '../aggregate'), this)

    /** If the recorder is running, we can pass error events on to the agg to help it switch to full mode later */
    this.ee.on('err', (e) => {
      if (this.blocked) return
      if (this.agentRef.runtime.isRecording) {
        this.errorNoticed = true
        handle(ERROR_DURING_REPLAY, [e], undefined, this.featureName, this.ee)
      }
    })
  }

  // At this point wherein session state exists already but we haven't init SessionEntity aka verify timers.
  #canPreloadRecorder (session) {
    if (!session) { // this might be a new session if entity initializes: conservatively start recording if first-time config allows
      // Note: users with SR enabled, as well as these other configs enabled by-default, will be penalized by the recorder overhead EVEN IF they don't actually have or get
      // entitlement or sampling decision, or otherwise intentionally opted-in for the feature.
      return isPreloadAllowed(this.agentRef.init)
    } else if (session.sessionReplayMode === MODE.FULL || session.sessionReplayMode === MODE.ERROR) {
      return true // existing sessions get to continue recording, regardless of this page's configs or if it has expired (conservatively)
    } else { // SR mode was OFF but may potentially be turned on if session resets and configs allows the new session to have replay...
      return isPreloadAllowed(this.agentRef.init)
    }
  }

  /**
   * Returns a promise that imports the recorder module. Only lets the recorder module be imported and instantiated once. Rejects if failed to import/instantiate.
   * @returns {Promise}
   */
  importRecorder () {
    /** if we already have a recorder fully set up, just return it */
    if (this.recorder) return Promise.resolve(this.recorder)
    /** conditional -- if we have never started importing, stage the import and store it in state */
    this.#stagedImport ??= import(/* webpackChunkName: "recorder" */'../shared/recorder')
      .then(({ Recorder }) => {
        this.recorder = new Recorder(this)
        /** return the recorder for promise chaining */
        return this.recorder
      })
      .catch(err => {
        this.ee.emit('internal-error', [err])
        this.blocked = true
        /** return the err for promise chaining */
        throw err
      })

    return this.#stagedImport
  }

  /**
   * Called whenever startReplay API is used. That could occur any time, pre or post load.
   */
  #apiStartOrRestartReplay () {
    if (this.blocked) return
    if (this.featAggregate) { // post-load; there's possibly already an ongoing recording
      if (this.featAggregate.mode !== MODE.FULL) this.featAggregate.initializeRecording(MODE.FULL, true, TRIGGERS.API)
    } else {
      this.importRecorder()
        .then(() => {
          this.recorder.startRecording(TRIGGERS.API, MODE.FULL)
        }) // could handle specific fail-state behaviors with a .catch block here
    }
  }
}

export const SessionReplay = Instrument
