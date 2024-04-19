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
import { handle } from '../../../common/event-emitter/handle'
import { DEFAULT_KEY, MODE, PREFIX } from '../../../common/session/constants'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, SR_EVENT_EMITTER_TYPES } from '../constants'
import { isPreloadAllowed } from '../shared/utils'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    let session
    this.replayRunning = false
    try {
      session = JSON.parse(localStorage.getItem(`${PREFIX}_${DEFAULT_KEY}`))
    } catch (err) { }

    if (this.#canPreloadRecorder(session)) {
      this.#startRecording(session?.sessionReplayMode)
    } else {
      this.importAggregator()
    }

    /** If the recorder is running, we can pass error events on to the agg to help it switch to full mode later */
    this.ee.on('err', (e) => {
      if (this.replayRunning) {
        this.errorNoticed = true
        handle(SR_EVENT_EMITTER_TYPES.ERROR_DURING_REPLAY, [e], undefined, this.featureName, this.ee)
      }
    })

    /** Emitted by the recorder when it starts capturing data, used to determine if we should pass errors on to the agg */
    this.ee.on(SR_EVENT_EMITTER_TYPES.REPLAY_RUNNING, (isRunning) => {
      this.replayRunning = isRunning
    })
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

  async #startRecording (mode) {
    const { Recorder } = (await import(/* webpackChunkName: "recorder" */'../shared/recorder'))
    this.recorder = new Recorder({ mode, agentIdentifier: this.agentIdentifier, ee: this.ee })
    this.recorder.startRecording()
    this.abortHandler = this.recorder.stopRecording
    this.importAggregator({ recorder: this.recorder, errorNoticed: this.errorNoticed })
  }
}
