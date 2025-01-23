/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { handle } from '../../../common/event-emitter/handle'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { globalScope } from '../../../common/constants/runtime'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { SR_EVENT_EMITTER_TYPES } from '../../session_replay/constants'
import { castError, castErrorEvent, castPromiseRejectionEvent } from '../shared/cast-error'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  #replayRunning = false

  constructor (agentRef, auto = true) {
    super(agentRef, FEATURE_NAME, auto)

    try {
      // this try-catch can be removed when IE11 is completely unsupported & gone
      this.removeOnAbort = new AbortController()
    } catch (e) {}

    this.ee.on('internal-error', (error, reason) => {
      if (!this.abortHandler) return
      handle('ierr', [castError(error), now(), true, {}, this.#replayRunning, reason], undefined, this.featureName, this.ee)
    })

    this.ee.on(SR_EVENT_EMITTER_TYPES.REPLAY_RUNNING, (isRunning) => {
      this.#replayRunning = isRunning
    })

    globalScope.addEventListener('unhandledrejection', (promiseRejectionEvent) => {
      if (!this.abortHandler) return
      handle('err', [castPromiseRejectionEvent(promiseRejectionEvent), now(), false, { unhandledPromiseRejection: 1 }, this.#replayRunning], undefined, this.featureName, this.ee)
    }, eventListenerOpts(false, this.removeOnAbort?.signal))

    globalScope.addEventListener('error', (errorEvent) => {
      if (!this.abortHandler) return
      handle('err', [castErrorEvent(errorEvent), now(), false, {}, this.#replayRunning], undefined, this.featureName, this.ee)
    }, eventListenerOpts(false, this.removeOnAbort?.signal))

    this.abortHandler = this.#abort // we also use this as a flag to denote that the feature is active or on and handling errors
    this.importAggregator(agentRef)
  }

  /** Restoration and resource release tasks to be done if JS error loader is being aborted. Unwind changes to globals. */
  #abort () {
    this.removeOnAbort?.abort()
    this.abortHandler = undefined // weakly allow this abort op to run only once
  }
}

export const JSErrors = Instrument
