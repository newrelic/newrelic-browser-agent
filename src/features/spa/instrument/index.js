/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  wrapMutation, wrapPromise, wrapHistory, wrapTimer, wrapFetch, wrapXhr, wrapJsonP
} from '../../../common/wrap'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { InstrumentBase } from '../../utils/instrument-base'
import { getRuntime } from '../../../common/config/config'
import { now } from '../../../common/timing/now'
import * as CONSTANTS from '../constants'
import { isBrowserScope } from '../../../common/util/global-scope'

const {
  FEATURE_NAME, START, END, BODY, CB_END, JS_TIME, FETCH, FN_START, CB_START, FN_END
} = CONSTANTS

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope) return // SPA not supported outside web env

    if (!getRuntime(agentIdentifier).xhrWrappable) return

    try { this.removeOnAbort = new AbortController() }
    catch (e) {}
    let depth = 0
    let startHash

    const tracerEE = this.ee.get('tracer')
    const jsonpEE = wrapJsonP(this.ee)
    const promiseEE = wrapPromise(this.ee)
    const timerEE = wrapTimer(this.ee)
    const xhrEE = wrapXhr(this.ee)
    const eventsEE = this.ee.get('events') // wrapXhr will call wrapEvents
    const fetchEE = wrapFetch(this.ee)
    const historyEE = wrapHistory(this.ee)
    const mutationEE = wrapMutation(this.ee)

    this.ee.on(FN_START, startTimestamp)
    promiseEE.on(CB_START, startTimestamp)
    jsonpEE.on(CB_START, startTimestamp)

    this.ee.on(FN_END, endTimestamp)
    promiseEE.on(CB_END, endTimestamp)
    jsonpEE.on(CB_END, endTimestamp)

    this.ee.buffer([FN_START, FN_END, 'xhr-resolved'], this.featureName)
    eventsEE.buffer([FN_START], this.featureName)
    timerEE.buffer(['setTimeout' + END, 'clearTimeout' + START, FN_START], this.featureName)
    xhrEE.buffer([FN_START, 'new-xhr', 'send-xhr' + START], this.featureName)
    fetchEE.buffer([FETCH + START, FETCH + '-done', FETCH + BODY + START, FETCH + BODY + END], this.featureName)
    historyEE.buffer(['newURL'], this.featureName)
    mutationEE.buffer([FN_START], this.featureName)
    promiseEE.buffer(['propagate', CB_START, CB_END, 'executor-err', 'resolve' + START], this.featureName)
    tracerEE.buffer([FN_START, 'no-' + FN_START], this.featureName)
    jsonpEE.buffer(['new-jsonp', 'cb-start', 'jsonp-error', 'jsonp-end'], this.featureName)

    timestamp(fetchEE, FETCH + START)
    timestamp(fetchEE, FETCH + '-done')
    timestamp(jsonpEE, 'new-jsonp')
    timestamp(jsonpEE, 'jsonp-end')
    timestamp(jsonpEE, 'cb-start')

    historyEE.on('pushState-end', trackURLChange)
    historyEE.on('replaceState-end', trackURLChange)

    window.addEventListener('hashchange', trackURLChange, eventListenerOpts(true, this.removeOnAbort?.signal))
    window.addEventListener('load', trackURLChange, eventListenerOpts(true, this.removeOnAbort?.signal))
    window.addEventListener('popstate', function () {
      trackURLChange(0, depth > 1)
    }, eventListenerOpts(true, this.removeOnAbort?.signal))

    function trackURLChange (unusedArgs, hashChangedDuringCb) {
      historyEE.emit('newURL', ['' + window.location, hashChangedDuringCb])
    }

    function startTimestamp () {
      depth++
      startHash = window.location.hash
      this[FN_START] = now()
    }

    function endTimestamp () {
      depth--
      if (window.location.hash !== startHash) {
        trackURLChange(0, true)
      }

      var time = now()
      this[JS_TIME] = (~~this[JS_TIME]) + time - this[FN_START]
      this[FN_END] = time
    }

    function timestamp (ee, type) {
      ee.on(type, function () {
        this[type] = now()
      })
    }

    this.abortHandler = this.#abort
    this.importAggregator()
  }

  /** Restoration and resource release tasks to be done if SPA loader is being aborted. Unwind changes to globals and subscription to DOM events. */
  #abort () {
    this.removeOnAbort?.abort()
    this.abortHandler = undefined // weakly allow this abort op to run only once
  }
}
