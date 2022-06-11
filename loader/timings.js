/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// collect page view timings unless the feature is explicitly disabled
if ('init' in NREUM && 'page_view_timing' in NREUM.init &&
  'enabled' in NREUM.init.page_view_timing &&
  NREUM.init.page_view_timing.enabled === false) {
  return
}

var handle = require('handle')
var loader = require('loader')
var visibility = require('visibility')
var eventListenerOpts = require('event-listener-opts')

var origEvent = NREUM.o.EV
var pageHiddenTime = visibility.initializeHiddenTime();

/* TODO: extend LCP's short circuit logic to FCP & CLS too, use this as refactor
function pageWasHiddenBefore(perfEntryStartTime) {
    return pageHiddenTime < perfEntryStartTime ? true : false;
} */

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

    // metrics become inflated if the page was ever hidden, so they aren't sent
    if (pageHiddenTime < entry.startTime) return;

    var payload = [entry]

    var attributes = addConnectionAttributes({})
    if (attributes) payload.push(attributes)

    handle('lcp', payload)
  }
}

function clsObserver(list) {
  list.getEntries().forEach(function(entry) {
    if (!entry.hadRecentInput) {
      handle('cls', [entry])
    }
  })
}

var performanceObserver
var lcpPerformanceObserver
var clsPerformanceObserver
if ('PerformanceObserver' in window && typeof window.PerformanceObserver === 'function') {
  // passing in an unknown entry type to observer could throw an exception
  performanceObserver = new PerformanceObserver(perfObserver) // eslint-disable-line no-undef
  try {
    performanceObserver.observe({entryTypes: ['paint']})
  } catch (e) {}

  lcpPerformanceObserver = new PerformanceObserver(lcpObserver) // eslint-disable-line no-undef
  try {
    lcpPerformanceObserver.observe({entryTypes: ['largest-contentful-paint']})
  } catch (e) {}

  clsPerformanceObserver = new PerformanceObserver(clsObserver) // eslint-disable-line no-undef
  try {
    clsPerformanceObserver.observe({type: 'layout-shift', buffered: true})
  } catch (e) {}
}

// first interaction and first input delay
if ('addEventListener' in document) {
  var fiRecorded = false
  var allowedEventTypes = ['click', 'keydown', 'mousedown', 'pointerdown', 'touchstart']
  allowedEventTypes.forEach(function (e) {
    document.addEventListener(e, captureInteraction, eventListenerOpts(false))
  })
}

// takes an attributes object and appends connection attributes if available
function addConnectionAttributes (attributes) {
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!connection) return

  if (connection.type) attributes['net-type'] = connection.type
  if (connection.effectiveType) attributes['net-etype'] = connection.effectiveType
  if (connection.rtt) attributes['net-rtt'] = connection.rtt
  if (connection.downlink) attributes['net-dlink'] = connection.downlink

  return attributes
}

function captureInteraction(evt) {
  if (evt instanceof origEvent && !fiRecorded) {
    var fi = Math.round(evt.timeStamp)
    var attributes = {
      type: evt.type
    }

    addConnectionAttributes(attributes)

    // The value of Event.timeStamp is epoch time in some old browser, and relative
    // timestamp in newer browsers. We assume that large numbers represent epoch time.
    if (fi <= loader.now()) {
      attributes['fid'] = loader.now() - fi
    } else if (fi > loader.offset && fi <= Date.now()) {
      fi = fi - loader.offset
      attributes['fid'] = loader.now() - fi
    } else {
      fi = loader.now()
    }

    fiRecorded = true
    handle('timing', ['fi', fi, attributes])
  }
}

// page visibility events
visibility.subscribeToVisibilityChange(captureVisibilityChange)

function captureVisibilityChange(newState) {
  if (newState === 'hidden') {
    // time is only recorded to be used for short-circuit logic in the observer callbacks
    pageHiddenTime = loader.now()
    handle('pageHide', [pageHiddenTime])
  }
}
