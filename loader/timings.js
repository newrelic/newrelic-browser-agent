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
var subscribeToVisibilityChange = require('visibility')

var origEvent = NREUM.o.EV

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
    handle('lcp', [entries[entries.length - 1]])
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
    document.addEventListener(e, captureInteraction, false)
  })
}

function captureInteraction(evt) {
  if (evt instanceof origEvent && !fiRecorded) {
    var fi = Math.round(evt.timeStamp)
    var attributes = {
      type: evt.type
    }

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
subscribeToVisibilityChange(captureVisibilityChange)

function captureVisibilityChange(state) {
  handle('pageHide', [loader.now(), state])
}
