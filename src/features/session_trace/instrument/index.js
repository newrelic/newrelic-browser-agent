/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { wrapHistory, wrapEvents } from '../../../common/wrap'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { isBrowserScope } from '../../../common/constants/runtime'
import { TimeKeeper } from '../../../common/timing/time-keeper'

const {
  BST_RESOURCE, RESOURCE, START, END, FEATURE_NAME, FN_END, FN_START, PUSH_STATE
} = CONSTANTS

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope) return // session traces not supported outside web env

    const thisInstrumentEE = this.ee
    wrapHistory(thisInstrumentEE)
    this.eventsEE = wrapEvents(thisInstrumentEE)

    this.eventsEE.on(FN_START, function (args, target) {
      this.bstStart = TimeKeeper.now()
    })
    this.eventsEE.on(FN_END, function (args, target) {
      // ISSUE: when target is XMLHttpRequest, nr@context should have params so we can calculate event origin
      // When ajax is disabled, this may fail without making ajax a dependency of session_trace
      handle('bst', [args[0], target, this.bstStart, TimeKeeper.now()], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
    })

    thisInstrumentEE.on(PUSH_STATE + START, function (args) {
      this.time = TimeKeeper.now()
      this.startPath = location.pathname + location.hash
    })
    thisInstrumentEE.on(PUSH_STATE + END, function (args) {
      handle('bstHist', [location.pathname + location.hash, this.startPath, this.time], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
    })

    let observer
    try {
      // Capture initial resources and watch for future ones. Don't defer this given there's a default cap on the number of buffered entries.
      observer = new PerformanceObserver((list) => { // eslint-disable-line no-undef
        const entries = list.getEntries()
        handle(BST_RESOURCE, [entries], undefined, FEATURE_NAMES.sessionTrace, thisInstrumentEE)
      })
      observer.observe({ type: RESOURCE, buffered: true })
    } catch (e) {
      // Per NEWRELIC-8525, we don't have a fallback for capturing resources for older versions that don't support PO at this time.
    }

    this.importAggregator({ resourceObserver: observer })
  }
}
