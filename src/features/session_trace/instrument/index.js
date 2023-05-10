/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { wrapHistory, wrapEvents, wrapTimer, wrapRaf } from '../../../common/wrap'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { isBrowserScope } from '../../../common/util/global-scope'

const {
  BST_RESOURCE, BST_TIMER, END, FEATURE_NAME, FN_END, FN_START,
  PUSH_STATE, RESOURCE, RESOURCE_TIMING_BUFFER_FULL, START
} = CONSTANTS

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope) return // session traces not supported outside web env

    const thisInstrumentEE = this.ee
    this.timerEE = wrapTimer(thisInstrumentEE)
    this.rafEE = wrapRaf(thisInstrumentEE)
    wrapHistory(thisInstrumentEE)
    this.eventsEE = wrapEvents(thisInstrumentEE)

    this.eventsEE.on(FN_START, function (args, target) {
      this.bstStart = now()
    })
    this.eventsEE.on(FN_END, function (args, target) {
      // ISSUE: when target is XMLHttpRequest, nr@context should have params so we can calculate event origin
      // When ajax is disabled, this may fail without making ajax a dependency of session_trace
      handle('bst', [args[0], target, this.bstStart, now()], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
    })

    this.timerEE.on(FN_START, function (args, obj, type) {
      this.bstStart = now()
      this.bstType = type
    })
    this.timerEE.on(FN_END, function (args, target) {
      handle(BST_TIMER, [target, this.bstStart, now(), this.bstType], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
    })

    this.rafEE.on(FN_START, function () {
      this.bstStart = now()
    })
    this.rafEE.on(FN_END, function (args, target) {
      handle(BST_TIMER, [target, this.bstStart, now(), 'requestAnimationFrame'], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
    })

    thisInstrumentEE.on(PUSH_STATE + START, function (args) {
      this.time = now()
      this.startPath = location.pathname + location.hash
    })
    thisInstrumentEE.on(PUSH_STATE + END, function (args) {
      handle('bstHist', [location.pathname + location.hash, this.startPath, this.time], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
    })

    try {
      // Capture initial resources and watch for future ones.
      const observer = new PerformanceObserver((list) => { // eslint-disable-line no-undef
        const entries = list.getEntries()
        handle(BST_RESOURCE, [entries], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
      })
      observer.observe({ type: RESOURCE, buffered: true })
    } catch (e) {
      // Use the older API to collect resource timings once when buffer is full.
      if (window.performance.clearResourceTimings) {
        window.performance.addEventListener?.(RESOURCE_TIMING_BUFFER_FULL, this.onResourceTimingBufferFull, eventListenerOpts(false))
      }
    }

    // document.addEventListener('scroll', noOp, eventListenerOpts(false))
    // document.addEventListener('keypress', noOp, eventListenerOpts(false))
    // document.addEventListener('click', noOp, eventListenerOpts(false))
    // noOp (e) { /* no-op */ }

    this.abortHandler = this.#abort
    this.importAggregator()
  }

  /** Restoration and resource release tasks to be done if Session trace loader is being aborted. Unwind changes to globals. */
  #abort () {
    window.performance.removeEventListener?.(RESOURCE_TIMING_BUFFER_FULL, this.onResourceTimingBufferFull, false)
    // The doc interaction noOp listeners are harmless--cannot buffer data into EE.
    this.abortHandler = undefined // weakly allow this abort op to run only once
  }

  onResourceTimingBufferFull (evt) {
    handle(BST_RESOURCE, [window.performance.getEntriesByType(RESOURCE)], undefined, FEATURE_NAMES.sessionTrace, this.ee)
    // Stop recording once buffer is full.
    window.performance.removeEventListener?.(RESOURCE_TIMING_BUFFER_FULL, this.onResourceTimingBufferFull, false)
  }
}
