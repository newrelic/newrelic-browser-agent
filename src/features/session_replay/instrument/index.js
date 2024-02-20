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
import { getConfigurationValue } from '../../../common/config/config'
import { MODE } from '../../../common/session/constants'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)

    console.log('instrument SR')
    try {
      const session = JSON.parse(localStorage.getItem('NRBA_SESSION'))
      if (session && session.sessionReplayMode !== MODE.OFF) {
        this.#startRecording(session.sessionReplayMode).finally(() => {
          this.importAggregator({ recorder: this.recorder })
        })
      } else {
        this.importAggregator({})
      }
    } catch (err) {
      this.importAggregator({})
    }

    this.ee.on('recordReplay', () => {
      if (
        getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled') === true &&
        getConfigurationValue(agentIdentifier, 'session_trace.enabled') === true
      ) this.#startRecording(MODE.FULL)
    })
  }

  async #startRecording (mode) {
    if (this.featAggregate) {
      console.log('has feat agg')
      if (this.featAggregate.entitled) this.featAggregate.initializeRecording(100, 100, true)
      /** dont need to reimport the recorder so just return if the featAgg exists */
      return
    }
    const { Recorder } = (await import(/* webpackChunkName: "recorder" */'../shared/recorder'))
    this.recorder = new Recorder({ mode, agentIdentifier: this.agentIdentifier })
    this.recorder.startRecording()
  }
}
