/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { wrapHistory, wrapEvents, wrapTimer, wrapRaf } from '../../../common/wrap'
import { supportsPerformanceObserver } from '../../../common/window/supports-performance-observer'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { getRuntime } from '../../../common/config/config'
import { now } from '../../../common/timing/now'
import { InstrumentBase } from '../../utils/instrument-base'
import { isBrowserWindow } from '../../../common/window/win'
import * as CONSTANTS from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'

const {
  ADD_EVENT_LISTENER, BST_RESOURCE, BST_TIMER, END, FEATURE_NAME, FN_END, FN_START, learResourceTimings,
  PUSH_STATE, REMOVE_EVENT_LISTENER, RESOURCE, RESOURCE_TIMING_BUFFER_FULL, START, ORIG_EVENT: origEvent
} = CONSTANTS

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor(agentIdentifier, aggregator, auto=true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserWindow) return; // session traces not supported outside web env

    if (!(window.performance &&
      window.performance.timing &&
      window.performance.getEntriesByType
    )) return

    getRuntime(this.agentIdentifier).features.stn = true

    const ee = this.ee

    this.timerEE = wrapTimer(this.ee)
    this.rafEE = wrapRaf(this.ee)
    wrapHistory(this.ee)
    wrapEvents(this.ee)

    this.ee.on(FN_START, function (args, target) {
      var evt = args[0]
      if (evt instanceof origEvent) {
        this.bstStart = now()
      }
    })

    this.ee.on(FN_END, function (args, target) {
      var evt = args[0]
      if (evt instanceof origEvent) {

        // ISSUE: when target is XMLHttpRequest, nr@context should have params so we can calculate event origin
        // When ajax is disabled, this may fail without making ajax a dependency of session_trace
        handle('bst', [evt, target, this.bstStart, now()], undefined, FEATURE_NAMES.sessionTrace, ee)
      }
    })

    this.timerEE.on(FN_START, function (args, obj, type) {
      this.bstStart = now()
      this.bstType = type
    })

    this.timerEE.on(FN_END, function (args, target) {
      handle(BST_TIMER, [target, this.bstStart, now(), this.bstType], undefined, FEATURE_NAMES.sessionTrace, ee)
    })

    this.rafEE.on(FN_START, function () {
      this.bstStart = now()
    })

    this.rafEE.on(FN_END, function (args, target) {
      handle(BST_TIMER, [target, this.bstStart, now(), 'requestAnimationFrame'], undefined, FEATURE_NAMES.sessionTrace, ee)
    })

    this.ee.on(PUSH_STATE + START, function (args) {
      this.time = now()
      this.startPath = location.pathname + location.hash
    })
    this.ee.on(PUSH_STATE + END, function (args) {
      handle('bstHist', [location.pathname + location.hash, this.startPath, this.time], undefined, FEATURE_NAMES.sessionTrace, ee)
    })

    if (supportsPerformanceObserver()) {
      // capture initial resources, in case our observer missed anything
      handle(BST_RESOURCE, [window.performance.getEntriesByType('resource')], undefined, FEATURE_NAMES.sessionTrace, ee)

      observeResourceTimings()
    } else {
      // collect resource timings once when buffer is full
      if (ADD_EVENT_LISTENER in window.performance) {
        if (window.performance['c' + learResourceTimings]) {
          window.performance[ADD_EVENT_LISTENER](RESOURCE_TIMING_BUFFER_FULL, onResourceTimingBufferFull, eventListenerOpts(false))
        } else {
          window.performance[ADD_EVENT_LISTENER]('webkit' + RESOURCE_TIMING_BUFFER_FULL, onResourceTimingBufferFull, eventListenerOpts(false))
        }
      }
    }

    function observeResourceTimings() {
      var observer = new PerformanceObserver((list, observer) => { // eslint-disable-line no-undef
        var entries = list.getEntries()

        handle(BST_RESOURCE, [entries], undefined, FEATURE_NAMES.sessionTrace, ee)
      })

      try {
        observer.observe({ entryTypes: ['resource'] })
      } catch (e) {
        // do nothing
      }
    }

    function onResourceTimingBufferFull(e) {

      handle(BST_RESOURCE, [window.performance.getEntriesByType(RESOURCE)], undefined, FEATURE_NAMES.jserrors, ee)

      // stop recording once buffer is full
      if (window.performance['c' + learResourceTimings]) {
        try {
          window.performance[REMOVE_EVENT_LISTENER](RESOURCE_TIMING_BUFFER_FULL, onResourceTimingBufferFull, false)
        } catch (e) {
          // do nothing
        }
      } else {
        try {
          window.performance[REMOVE_EVENT_LISTENER]('webkit' + RESOURCE_TIMING_BUFFER_FULL, onResourceTimingBufferFull, false)
        } catch (e) {
          // do nothing
        }
      }
    }

    document[ADD_EVENT_LISTENER]('scroll', this.noOp, eventListenerOpts(false))
    document[ADD_EVENT_LISTENER]('keypress', this.noOp, eventListenerOpts(false))
    document[ADD_EVENT_LISTENER]('click', this.noOp, eventListenerOpts(false))

    this.importAggregator()
  }

  noOp(e) { /* no-op */ }
}
