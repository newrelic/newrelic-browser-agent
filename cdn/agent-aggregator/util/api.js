/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerHandler } from '@newrelic/browser-agent-core/common/event-emitter/register-handler'
import { single } from '@newrelic/browser-agent-core/common/util/single'
import { submitData } from '@newrelic/browser-agent-core/common/util/submit-data'
import { mapOwn } from '@newrelic/browser-agent-core/common/util/map-own'
import { handle } from '@newrelic/browser-agent-core/common/event-emitter/handle'
import { getConfigurationValue, getInfo, getRuntime } from '@newrelic/browser-agent-core/common/config/config'
import { ee } from '@newrelic/browser-agent-core/common/event-emitter/contextual-ee'

export function initializeAPI(agentIdentifier) {
    var sharedEE = ee.get(agentIdentifier)
    var cycle = 0

    var scheme = (getConfigurationValue(agentIdentifier, 'ssl') === false) ? 'http' : 'https'

    var api = {
        finished: single(finished),
        setPageViewName: setPageViewName,
        setErrorHandler: setErrorHandler,
        addToTrace: addToTrace,
        inlineHit: inlineHit,
        addRelease: addRelease
    }

    // Hook all of the api functions up to the queues/stubs created in loader/api.js
    mapOwn(api, function (fnName, fn) {
        registerHandler('api-' + fnName, fn, 'api', sharedEE)
    })

    // All API functions get passed the time they were called as their
    // first parameter. These functions can be called asynchronously.

    function setPageViewName(t, name, host) {
        if (typeof name !== 'string') return
        if (name.charAt(0) !== '/') name = '/' + name
        getRuntime(agentIdentifier).customTransaction = (host || 'http://custom.transaction') + name
    }

    function finished(t, providedTime) {
        var time = providedTime ? providedTime - getRuntime(agentIdentifier).offset : t
        console.log("handle record-custom")
        handle('record-custom', ['finished', {time}])
        addToTrace(t, { name: 'finished', start: time + getRuntime(agentIdentifier).offset, origin: 'nr' })
        handle('api-addPageAction', [time, 'finished'], undefined, undefined, sharedEE)
    }

    function addToTrace(t, evt) {
        if (!(evt && typeof evt === 'object' && evt.name && evt.start)) return

        var report = {
            n: evt.name,
            s: evt.start - getRuntime(agentIdentifier).offset,
            e: (evt.end || evt.start) - getRuntime(agentIdentifier).offset,
            o: evt.origin || '',
            t: 'api'
        }

        handle('bstApi', [report], undefined, undefined, sharedEE)
    }

    // NREUM.inlineHit(request_name, queue_time, app_time, total_be_time, dom_time, fe_time)
    //
    // request_name - the 'web page' name or service name
    // queue_time - the amount of time spent in the app tier queue
    // app_time - the amount of time spent in the application code
    // total_be_time - the total roundtrip time of the remote service call
    // dom_time - the time spent processing the result of the service call (or user defined)
    // fe_time - the time spent rendering the result of the service call (or user defined)
    function inlineHit(t, request_name, queue_time, app_time, total_be_time, dom_time, fe_time) {
        request_name = window.encodeURIComponent(request_name)
        cycle += 1

        if (!getRuntime(agentIdentifier).info.beacon) return

        var url = scheme + '://' + getInfo(agentIdentifier).beacon + '/1/' + getInfo(agentIdentifier).licenseKey

        url += '?a=' + getInfo(agentIdentifier).applicationID + '&'
        url += 't=' + request_name + '&'
        url += 'qt=' + ~~queue_time + '&'
        url += 'ap=' + ~~app_time + '&'
        url += 'be=' + ~~total_be_time + '&'
        url += 'dc=' + ~~dom_time + '&'
        url += 'fe=' + ~~fe_time + '&'
        url += 'c=' + cycle

        submitData.img(url)
    }

    function setErrorHandler(t, handler) {
        getRuntime(agentIdentifier).onerror = handler
    }

    var releaseCount = 0
    function addRelease(t, name, id) {
        if (++releaseCount > 10) return
        getRuntime(agentIdentifier).releaseIds[name.slice(-200)] = ('' + id).slice(-200)
    }

}