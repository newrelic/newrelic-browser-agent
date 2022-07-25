/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
*/
import { wrapMutation, wrapPromise, wrapHistory, wrapEvents, wrapTimer, wrapFetch, wrapXhr, wrapJson } from '../../../common/wrap'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { FeatureBase } from '../../../common/util/feature-base'
import { getRuntime } from '../../../common/config/config'
import { now } from '../../../common/timing/now'

var START = '-start'
var END = '-end'
var BODY = '-body'
var FN_START = 'fn' + START
var FN_END = 'fn' + END
var CB_START = 'cb' + START
var CB_END = 'cb' + END
var JS_TIME = 'jsTime'
var FETCH = 'fetch'
var ADD_EVENT_LISTENER = 'addEventListener'

var win = window
var location = win.location

export class Instrument extends FeatureBase {
    constructor(agentIdentifier) {
        super(agentIdentifier)
        const agentRuntime = getRuntime(this.agentIdentifier);
        // loader.xhrWrappable will be false in chrome for ios, but addEventListener is still available.
        // sauce does not have a browser to test this case against, so be careful when modifying this check
        if (!win[ADD_EVENT_LISTENER] || !agentRuntime.xhrWrappable || agentRuntime.disabled) return
        agentRuntime.features.spa = true;

        // console.log("initialize spa instrument!", agentIdentifier)

        let depth = 0
        let startHash

        const tracerEE = this.ee.get('tracer')
        const jsonpEE = wrapJson(this.ee)
        const promiseEE = wrapPromise(this.ee)
        const eventsEE = wrapEvents(this.ee)
        const timerEE = wrapTimer(this.ee)
        const xhrEE = wrapXhr(this.ee)
        const fetchEE = wrapFetch(this.ee)
        const historyEE = wrapHistory(this.ee)
        const mutationEE = wrapMutation(this.ee)

        this.ee.on(FN_START, startTimestamp)
        promiseEE.on(CB_START, startTimestamp)
        jsonpEE.on(CB_START, startTimestamp)

        this.ee.on(FN_END, endTimestamp)
        promiseEE.on(CB_END, endTimestamp)
        jsonpEE.on(CB_END, endTimestamp)

        this.ee.buffer([FN_START, FN_END, 'xhr-resolved'])
        eventsEE.buffer([FN_START])
        timerEE.buffer(['setTimeout' + END, 'clearTimeout' + START, FN_START])
        xhrEE.buffer([FN_START, 'new-xhr', 'send-xhr' + START])
        fetchEE.buffer([FETCH + START, FETCH + '-done', FETCH + BODY + START, FETCH + BODY + END])
        historyEE.buffer(['newURL'])
        mutationEE.buffer([FN_START])
        promiseEE.buffer(['propagate', CB_START, CB_END, 'executor-err', 'resolve' + START])
        tracerEE.buffer([FN_START, 'no-' + FN_START])
        jsonpEE.buffer(['new-jsonp', 'cb-start', 'jsonp-error', 'jsonp-end'])

        timestamp(fetchEE, FETCH + START)
        timestamp(fetchEE, FETCH + '-done')
        timestamp(jsonpEE, 'new-jsonp')
        timestamp(jsonpEE, 'jsonp-end')
        timestamp(jsonpEE, 'cb-start')

        historyEE.on('pushState-end', trackURLChange)
        historyEE.on('replaceState-end', trackURLChange)

        win[ADD_EVENT_LISTENER]('hashchange', trackURLChange, eventListenerOpts(true))
        win[ADD_EVENT_LISTENER]('load', trackURLChange, eventListenerOpts(true))
        win[ADD_EVENT_LISTENER]('popstate', function () {
            trackURLChange(0, depth > 1)
        }, eventListenerOpts(true))

        function trackURLChange(unusedArgs, hashChangedDuringCb) {
            historyEE.emit('newURL', ['' + location, hashChangedDuringCb])
        }
    
        function startTimestamp() {
            depth++
            startHash = location.hash
            this[FN_START] = now()
        }
    
        function endTimestamp() {
            depth--
            if (location.hash !== startHash) {
                trackURLChange(0, true)
            }
    
            var time = now()
            this[JS_TIME] = (~~this[JS_TIME]) + time - this[FN_START]
            this[FN_END] = time
        }
    
        function timestamp(ee, type) {
            ee.on(type, function () {
                this[type] = now()
            })
        }
    }
}
