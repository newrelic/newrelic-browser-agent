/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { wrapHistory, wrapEvents, wrapTimer, wrapRaf } from '../../../common/wrap'
import { supportsPerformanceObserver } from '../../../common/window/supports-performance-observer'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { isBrowserScope } from '../../../common/util/global-scope'

const {
  BST_RESOURCE, BST_TIMER, END, FEATURE_NAME, FN_END, FN_START, ADD_EVENT_LISTENER,
  PUSH_STATE, RESOURCE, RESOURCE_TIMING_BUFFER_FULL, START, ORIG_EVENT: origEvent
} = CONSTANTS
const CRT = 'clearResourceTimings'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope) return // session traces not supported outside web env

    const thisInstrumentEE = this.ee
    this.timerEE = wrapTimer(thisInstrumentEE)
    this.rafEE = wrapRaf(thisInstrumentEE)
    wrapHistory(thisInstrumentEE)
    wrapEvents(thisInstrumentEE)

    thisInstrumentEE.on(FN_START, function (args, target) {
      var evt = args[0]
      if (evt instanceof origEvent) {
        this.bstStart = now()
      }
    })

    thisInstrumentEE.on(FN_END, function (args, target) {
      var evt = args[0]
      if (evt instanceof origEvent) {
        // ISSUE: when target is XMLHttpRequest, nr@context should have params so we can calculate event origin
        // When ajax is disabled, this may fail without making ajax a dependency of session_trace
        handle('bst', [evt, target, this.bstStart, now()], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
      }
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

    if (supportsPerformanceObserver()) {
      // capture initial resources, in case our observer missed anything
      handle(BST_RESOURCE, [window.performance.getEntriesByType('resource')], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)

      observeResourceTimings()
    } else {
      // collect resource timings once when buffer is full
      if (window.performance[CRT] && window.performance[ADD_EVENT_LISTENER])
      { window.performance.addEventListener(RESOURCE_TIMING_BUFFER_FULL, this.onResourceTimingBufferFull, eventListenerOpts(false)) }
    }

    function observeResourceTimings () {
      var observer = new PerformanceObserver((list, observer) => { // eslint-disable-line no-undef
        var entries = list.getEntries()

        handle(BST_RESOURCE, [entries], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
      })

      try {
        observer.observe({ entryTypes: ['resource'] })
      } catch (e) {
        // do nothing
      }
    }

    document.addEventListener('scroll', this.noOp, eventListenerOpts(false))
    document.addEventListener('keypress', this.noOp, eventListenerOpts(false))
    document.addEventListener('click', this.noOp, eventListenerOpts(false))

    this.abortHandler = this.#abort
    this.importAggregator()
  }

  /** Restoration and resource release tasks to be done if Session trace loader is being aborted. Unwind changes to globals. */
  #abort () {
    window.performance.removeEventListener(RESOURCE_TIMING_BUFFER_FULL, this.onResourceTimingBufferFull, false)
    // The doc interaction noOp listeners are harmless--cannot buffer data into EE.
    this.abortHandler = undefined // weakly allow this abort op to run only once
  }

  noOp (e) { /* no-op */ }

  onResourceTimingBufferFull (evt) {
    handle(BST_RESOURCE, [window.performance.getEntriesByType(RESOURCE)], undefined, FEATURE_NAMES.sessionTrace, this.ee)

    // stop recording once buffer is full
    if (window.performance[CRT]) {
      try {
        window.performance.removeEventListener(RESOURCE_TIMING_BUFFER_FULL, this.onResourceTimingBufferFull, false)
      } catch (e) {}
    }
  }
}
