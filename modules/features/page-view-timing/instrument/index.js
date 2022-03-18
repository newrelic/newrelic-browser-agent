/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { subscribeToVisibilityChange } from '../../../common/window/visibility'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { gosNREUM } from '../../../common/window/nreum'
import { getOffset, now } from '../../../common/timing/now'
import { getConfigurationValue } from '../../../common/config/config'

var pageHiddenTime
var performanceObserver
var lcpPerformanceObserver
var clsPerformanceObserver
var fiRecorded = false

// collect page view timings unless the feature is explicitly disabled
// function isEnabled() {
//     const NREUM = gosNREUM()
//     if ('init' in NREUM && 'page_view_timing' in NREUM.init &&
//         'enabled' in NREUM.init.page_view_timing &&
//         NREUM.init.page_view_timing.enabled === false) {
//         return false
//     }
//     return true
// }

function isEnabled() {
    return getConfigurationValue('page_view_timing.enabled') === false ? false : true
}

// paint metrics
function perfObserver(list, observer) {
    var entries = list.getEntries()
    entries.forEach(function (entry) {
        if (entry.name === 'first-paint') {
            handle('timing', ['fp', Math.floor(entry.startTime)])
        } else if (entry.name === 'first-contentful-paint') {
            handle('timing', ['fcp', Math.floor(entry.startTime)])
        }
    })
}

// largest contentful paint
function lcpObserver(list, observer) {
    var entries = list.getEntries()
    if (entries.length > 0) {
        var entry = entries[entries.length - 1]

        if (pageHiddenTime && pageHiddenTime < entry.startTime) return

        var payload = [entry]

        var attributes = addConnectionAttributes({})
        if (attributes) payload.push(attributes)

        handle('lcp', payload)
    }
}

function clsObserver(list) {
    list.getEntries().forEach(function (entry) {
        if (!entry.hadRecentInput) {
            handle('cls', [entry])
        }
    })
}

export function initialize () {
    if (isEnabled()) {
        console.log("instrumentPageViewTiming!")
        if ('PerformanceObserver' in window && typeof window.PerformanceObserver === 'function') {
            // passing in an unknown entry type to observer could throw an exception
            performanceObserver = new PerformanceObserver(perfObserver) // eslint-disable-line no-undef
            try {
                performanceObserver.observe({ entryTypes: ['paint'] })
            } catch (e) { }

            lcpPerformanceObserver = new PerformanceObserver(lcpObserver) // eslint-disable-line no-undef
            try {
                lcpPerformanceObserver.observe({ entryTypes: ['largest-contentful-paint'] })
            } catch (e) { }

            clsPerformanceObserver = new PerformanceObserver(clsObserver) // eslint-disable-line no-undef
            try {
                clsPerformanceObserver.observe({ type: 'layout-shift', buffered: true })
            } catch (e) { }
        }

        // first interaction and first input delay
        if ('addEventListener' in document) {
            fiRecorded = false
            var allowedEventTypes = ['click', 'keydown', 'mousedown', 'pointerdown', 'touchstart']
            allowedEventTypes.forEach(function (e) {
                console.log("click", e)
                document.addEventListener(e, captureInteraction, eventListenerOpts(false))
            })
        }
        // page visibility events
        subscribeToVisibilityChange(captureVisibilityChange)
    }
}

// takes an attributes object and appends connection attributes if available
function addConnectionAttributes(attributes) {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (!connection) return

    if (connection.type) attributes['net-type'] = connection.type
    if (connection.effectiveType) attributes['net-etype'] = connection.effectiveType
    if (connection.rtt) attributes['net-rtt'] = connection.rtt
    if (connection.downlink) attributes['net-dlink'] = connection.downlink

    return attributes
}

function captureInteraction(evt) {
    // if (evt instanceof origEvent && !fiRecorded) {
        if (evt instanceof gosNREUM().o.EV && !fiRecorded) {
        var fi = Math.round(evt.timeStamp)
        var attributes = {
            type: evt.type
        }

        addConnectionAttributes(attributes)

        // The value of Event.timeStamp is epoch time in some old browser, and relative
        // timestamp in newer browsers. We assume that large numbers represent epoch time.
        if (fi <= now()) {
            attributes['fid'] = now() - fi
        } else if (fi > getOffset() && fi <= Date.now()) {
            fi = fi - getOffset()
            attributes['fid'] = now() - fi
        } else {
            fi = now()
        }

        fiRecorded = true
        handle('timing', ['fi', fi, attributes])
    }
}

function captureVisibilityChange(state) {
    if (state === 'hidden') {
        pageHiddenTime = now()
        handle('pageHide', [pageHiddenTime])
    }
}
