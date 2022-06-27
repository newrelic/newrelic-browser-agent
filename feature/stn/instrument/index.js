/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

if (!(window.performance &&
  window.performance.timing &&
  window.performance.getEntriesByType
)) return

var ee = require('ee')
var handle = require('handle')
var timerEE = require('../../wrap-timer')
var rafEE = require('../../wrap-raf')
var supportsPerformanceObserver = require('supports-performance-observer')
var eventListenerOpts = require('event-listener-opts')

var learResourceTimings = 'learResourceTimings'
var ADD_EVENT_LISTENER = 'addEventListener'
var REMOVE_EVENT_LISTENER = 'removeEventListener'
var RESOURCE_TIMING_BUFFER_FULL = 'resourcetimingbufferfull'
var BST_RESOURCE = 'bstResource'
var RESOURCE = 'resource'
var START = '-start'
var END = '-end'
var FN_START = 'fn' + START
var FN_END = 'fn' + END
var BST_TIMER = 'bstTimer'
var PUSH_STATE = 'pushState'

// Turn on feature harvesting
var loader = require('loader')
if (loader.disabled) return

loader.features.stn = true

// wrap history ap
require('../../wrap-history')

// wrap events from [window, document, XHR].addEventListener
if ('addEventListener' in window) {
  require('../../wrap-events')
}

// Cache the value of window.Event for later instanceof checks, in case someone
// overwrites it to be a non-function.
var origEvent = NREUM.o.EV

ee.on(FN_START, function (args, target) {
  var evt = args[0]
  // events from [window, document, XHR].addEventListener
  if (evt instanceof origEvent) {
    this.bstStart = loader.now()
  }
})

ee.on(FN_END, function (args, target) {
  var evt = args[0]
  // events from [window, document, XHR].addEventListener
  if (evt instanceof origEvent) {
    handle('bst', [evt, target, this.bstStart, loader.now()])
  }
})

timerEE.on(FN_START, function (args, obj, type) {
  this.bstStart = loader.now()
  this.bstType = type
})

timerEE.on(FN_END, function (args, target) {
  handle(BST_TIMER, [target, this.bstStart, loader.now(), this.bstType])
})

rafEE.on(FN_START, function () {
  this.bstStart = loader.now()
})

rafEE.on(FN_END, function (args, target) {
  handle(BST_TIMER, [target, this.bstStart, loader.now(), 'requestAnimationFrame'])
})

ee.on(PUSH_STATE + START, function (args) {
  this.time = loader.now()
  this.startPath = location.pathname + location.hash
})
ee.on(PUSH_STATE + END, function (args) {
  handle('bstHist', [location.pathname + location.hash, this.startPath, this.time])
})

function observeResourceTimings () {
  var observer = new PerformanceObserver(function (list, observer) { // eslint-disable-line no-undef
    var entries = list.getEntries()

    handle(BST_RESOURCE, [entries])
  })

  try {
    observer.observe({entryTypes: ['resource']})
  } catch (e) {}
}

function onResourceTimingBufferFull (e) {
  handle(BST_RESOURCE, [window.performance.getEntriesByType(RESOURCE)])

  // stop recording once buffer is full
  if (window.performance['c' + learResourceTimings]) {
    try {
      window.performance[REMOVE_EVENT_LISTENER](RESOURCE_TIMING_BUFFER_FULL, onResourceTimingBufferFull, false)
    } catch (e) {}
  } else {
    try {
      window.performance[REMOVE_EVENT_LISTENER]('webkit' + RESOURCE_TIMING_BUFFER_FULL, onResourceTimingBufferFull, false)
    } catch (e) {}
  }
}

if (supportsPerformanceObserver()) {
  // capture initial resources, in case our observer missed anything
  handle(BST_RESOURCE, [window.performance.getEntriesByType('resource')])

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

// these trigger instrumentation above to create click, scroll and keypress events
document[ADD_EVENT_LISTENER]('scroll', noOp, eventListenerOpts(false))
document[ADD_EVENT_LISTENER]('keypress', noOp, eventListenerOpts(false))
document[ADD_EVENT_LISTENER]('click', noOp, eventListenerOpts(false))

function noOp (e) { /* no-op */ }
