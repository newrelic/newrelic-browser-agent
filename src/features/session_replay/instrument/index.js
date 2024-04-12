/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Primes the Session Replay feature for lazy loading.
 *
 * NOTE: This code is under development and dormant. It will not download to instrumented pages or record any data.
 * It is not production ready, and is not intended to be imported or implemented in any build of the browser agent until
 * functionality is validated and a full user experience is curated.
 */
import { DEFAULT_KEY, MODE, PREFIX } from '../../../common/session/constants'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, TRIGGERS } from '../constants'
import { hasReplayPrerequisite, isPreloadAllowed } from '../shared/utils'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME

  #mode
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    let session
    try {
      session = JSON.parse(localStorage.getItem(`${PREFIX}_${DEFAULT_KEY}`))
    } catch (err) { }

    if (hasReplayPrerequisite(agentIdentifier)) {
      this.ee.on('recordReplay', () => this.#apiStartOrRestartReplay())
    }

    if (this.#canPreloadRecorder(session)) {
      this.#mode = session?.sessionReplayMode
      this.#preloadStartRecording()
      /** If this is preloaded, set up a buffer, if not, later when sampling we will set up a .on for live events */
      this.ee.on('err', (e) => {
        this.errorNoticed = true
        if (this.featAggregate) this.featAggregate.handleError()
      })
    } else {
      this.importAggregator()
    }
  }

  // At this point wherein session state exists already but we haven't init SessionEntity aka verify timers.
  #canPreloadRecorder (session) {
    if (!session) { // this might be a new session if entity initializes: conservatively start recording if first-time config allows
      // Note: users with SR enabled, as well as these other configs enabled by-default, will be penalized by the recorder overhead EVEN IF they don't actually have or get
      // entitlement or sampling decision, or otherwise intentionally opted-in for the feature.
      return isPreloadAllowed(this.agentIdentifier)
    } else if (session.sessionReplayMode === MODE.FULL || session.sessionReplayMode === MODE.ERROR) {
      return true // existing sessions get to continue recording, regardless of this page's configs or if it has expired (conservatively)
    } else { // SR mode was OFF but may potentially be turned on if session resets and configs allows the new session to have replay...
      return isPreloadAllowed(this.agentIdentifier)
    }
  }

  #alreadyStarted = false
  /**
   * This func is use for early pre-load recording prior to replay feature (agg) being loaded onto the page. It should only setup once, including if already called and in-progress.
   */
  async #preloadStartRecording (trigger) {
    if (this.#alreadyStarted) return
    this.#alreadyStarted = true

    try {
      const { Recorder } = (await import(/* webpackChunkName: "recorder" */'../shared/recorder'))

      // If startReplay() has been used by this point, we must record in full mode regardless of session preload:
      // Note: recorder starts here with w/e the mode is at this time, but this may be changed later (see #apiStartOrRestartReplay else-case)
      this.recorder ??= new Recorder({ mode: this.#mode, agentIdentifier: this.agentIdentifier, trigger, ee: this.ee })
      this.recorder.startRecording()
      this.abortHandler = this.recorder.stopRecording
    } catch (e) {}
    this.importAggregator({ recorder: this.recorder, errorNoticed: this.errorNoticed })
  }

  /**
   * Called whenever startReplay API is used. That could occur any time, pre or post load.
   */
  #apiStartOrRestartReplay () {
    if (this.featAggregate) { // post-load; there's possibly already an ongoing recording
      if (this.featAggregate.mode !== MODE.FULL) this.featAggregate.initializeRecording(MODE.FULL, true)
    } else { // pre-load
      this.#mode = MODE.FULL
      this.#preloadStartRecording(TRIGGERS.API)
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
