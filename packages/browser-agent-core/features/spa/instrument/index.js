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
        // loader.xhrWrappable will be false in chrome for ios, but addEventListener is still available.
        // sauce does not have a browser to test this case against, so be careful when modifying this check
        if (!win[ADD_EVENT_LISTENER] || !getRuntime(this.agentIdentifier).xhrWrappable || getRuntime(this.agentIdentifier).disabled) return

        console.log("initialize spa instrument!", agentIdentifier)

        getRuntime(this.agentIdentifier).features.spa = true

        this.depth = 0
        this.startHash

        this.tracerEE = this.ee.get('tracer')
        this.jsonpEE = wrapJson(this.ee)
        this.promiseEE = wrapPromise(this.ee)
        this.eventsEE = wrapEvents(this.ee)
        this.timerEE = wrapTimer(this.ee)
        this.xhrEE = wrapXhr(this.ee)
        this.fetchEE = wrapFetch(this.ee)
        this.historyEE = wrapHistory(this.ee)
        this.mutationEE = wrapMutation(this.ee)

        this.ee.on(FN_START, (...args) => this.startTimestamp(...args))
        this.promiseEE.on(CB_START, (...args) => this.startTimestamp(...args))
        this.jsonpEE.on(CB_START, (...args) => this.startTimestamp(...args))

        this.ee.on(FN_END, (...args) => this.endTimestamp(...args))
        this.promiseEE.on(CB_END, (...args) => this.endTimestamp(...args))
        this.jsonpEE.on(CB_END, (...args) => this.endTimestamp(...args))

        this.ee.buffer([FN_START, FN_END, 'xhr-resolved'])
        this.eventsEE.buffer([FN_START])
        this.timerEE.buffer(['setTimeout' + END, 'clearTimeout' + START, FN_START])
        this.xhrEE.buffer([FN_START, 'new-xhr', 'send-xhr' + START])
        this.fetchEE.buffer([FETCH + START, FETCH + '-done', FETCH + BODY + START, FETCH + BODY + END])
        this.historyEE.buffer(['newURL'])
        this.mutationEE.buffer([FN_START])
        this.promiseEE.buffer(['propagate', CB_START, CB_END, 'executor-err', 'resolve' + START])
        this.tracerEE.buffer([FN_START, 'no-' + FN_START])
        this.jsonpEE.buffer(['new-jsonp', 'cb-start', 'jsonp-error', 'jsonp-end'])

        this.timestamp(this.fetchEE, FETCH + START)
        this.timestamp(this.fetchEE, FETCH + '-done')
        this.timestamp(this.jsonpEE, 'new-jsonp')
        this.timestamp(this.jsonpEE, 'jsonp-end')
        this.timestamp(this.jsonpEE, 'cb-start')

        this.historyEE.on('pushState-end', (...args) => this.trackURLChange(...args))
        this.historyEE.on('replaceState-end', (...args) => this.trackURLChange(...args))

        win[ADD_EVENT_LISTENER]('hashchange', (...args) => this.trackURLChange(...args), eventListenerOpts(true))
        win[ADD_EVENT_LISTENER]('load', (...args) => this.trackURLChange(...args), eventListenerOpts(true))
        win[ADD_EVENT_LISTENER]('popstate', () => {
            this.trackURLChange(0, depth > 1)
        }, eventListenerOpts(true))
    }

    trackURLChange(unusedArgs, hashChangedDuringCb) {
        this.historyEE.emit('newURL', ['' + location, hashChangedDuringCb])
    }

    startTimestamp() {
        this.depth++
        this.startHash = location.hash
        this[FN_START] = now()
    }

    endTimestamp() {
        this.depth--
        if (location.hash !== this.startHash) {
            this.trackURLChange(0, true)
        }

        var time = now()
        this[JS_TIME] = (~~this[JS_TIME]) + time - this[FN_START]
        this[FN_END] = time
    }

    timestamp(ee, type) {
        ee.on(type, () => {
            this[type] = now()
        })
    }

}
