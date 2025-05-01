/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { isBrowserScope } from '../../../common/constants/runtime'
import { now } from '../../../common/timing/now'
import { handle } from '../../../common/event-emitter/handle'
import { wrapJsonP } from '../../../common/wrap/wrap-jsonp'
import { wrapPromise } from '../../../common/wrap/wrap-promise'
import { wrapTimer } from '../../../common/wrap/wrap-timer'
import { wrapXhr } from '../../../common/wrap/wrap-xhr'
import { wrapFetch } from '../../../common/wrap/wrap-fetch'
import { wrapHistory } from '../../../common/wrap/wrap-history'
import { wrapMutation } from '../../../common/wrap/wrap-mutation'
import { setupInteractionAPI } from '../../../loaders/api/interaction'

const {
  FEATURE_NAME, START, END, BODY, CB_END, JS_TIME, FETCH, FN_START, CB_START, FN_END
} = CONSTANTS

/**
 * @deprecated This feature has been deprecated, in favor of `soft_navigations`, which is in limited preview. Consider using/importing `SoftNavigations` instead. To gain access to the limited preview, please see https://docs.newrelic.com/docs/browser/single-page-app-monitoring/get-started/browser-spa-v2/ for more information. This feature will be removed in a future release.
 */
export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, FEATURE_NAME, auto)

    /** feature specific APIs */
    setupInteractionAPI(agentRef)

    if (!isBrowserScope) return // SPA not supported outside web env

    try {
      this.removeOnAbort = new AbortController()
    } catch (e) {}

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

    this.ee.on('fn-err', (...args) => { if (!args[2]?.__newrelic?.[agentRef.agentIdentifier]) handle('function-err', [...args], undefined, this.featureName, this.ee) })

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
    this.importAggregator(agentRef, () => import(/* webpackChunkName: "spa-aggregate" */ '../aggregate'))
  }

  /** Restoration and resource release tasks to be done if SPA loader is being aborted. Unwind changes to globals and subscription to DOM events. */
  #abort () {
    this.removeOnAbort?.abort()
    this.abortHandler = undefined // weakly allow this abort op to run only once
  }
}

export const Spa = Instrument
