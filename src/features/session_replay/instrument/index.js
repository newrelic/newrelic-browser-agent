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
import { debugNR1 } from '../../utils/nr1-debugger'
import { FEATURE_NAME } from '../constants'
import { isPreloadAllowed } from '../shared/utils'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    let session
    try {
      session = JSON.parse(localStorage.getItem(`${PREFIX}_${DEFAULT_KEY}`))
    } catch (err) { }

    debugNR1(this.agentIdentifier, 'SESSION_REPLAY.INST', 'constructor', {

    })

    if (this.#canPreloadRecorder(session)) {
      debugNR1(this.agentIdentifier, 'SESSION_REPLAY.INST', 'canPreload', {

      })
      /** If this is preloaded, set up a buffer, if not, later when sampling we will set up a .on for live events */
      this.ee.on('err', (e) => {
        this.errorNoticed = true
        // if (this.featAggregate) this.featAggregate.handleError()
        debugNR1(this.agentIdentifier, 'SESSION_REPLAY.INST', 'this.ee.on(err)', {

        })
        handle('preload-errs', [e], undefined, this.featureName, this.ee)
      })
      this.#startRecording(session?.sessionReplayMode)
    } else {
      debugNR1(this.agentIdentifier, 'SESSION_REPLAY.INST', 'importAggregator (regular)', {

      })
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

  async #startRecording (mode) {
    debugNR1(this.agentIdentifier, 'SESSION_REPLAY.INST', 'startRecording', {
      mode,
      errorNoticed: this.errorNoticed
    })
    debugNR1(this.agentIdentifier, 'SESSION_REPLAY.INST', 'startRecording', {
      mode,
      errorNoticed: this.errorNoticed
    })
    const { Recorder } = (await import(/* webpackChunkName: "recorder" */'../shared/recorder'))
    this.recorder = new Recorder({ mode, agentIdentifier: this.agentIdentifier, ee: this.ee })
    this.recorder.startRecording()
    this.abortHandler = this.recorder.stopRecording
    debugNR1(this.agentIdentifier, 'SESSION_REPLAY.INST', 'importAggregator (preload)', {
      errorNoticed: this.errorNoticed
    })
    this.importAggregator({ recorder: this.recorder, errorNoticed: this.errorNoticed })
  }
}
