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

var learResourceTimings = 'learResourceTimings'
var ADD_EVENT_LISTENER = 'addEventListener'
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
loader.features.stn = true

// wrap history ap
require('../../wrap-history')

// wrap events
if ('addEventListener' in window) {
  require('../../wrap-events')
}

// Cache the value of window.Event for later instanceof checks, in case someone
// overwrites it to be a non-function.
var origEvent = NREUM.o.EV

ee.on(FN_START, function (args, target) {
  var evt = args[0]
  if (evt instanceof origEvent) {
    this.bstStart = loader.now()
  }
})

ee.on(FN_END, function (args, target) {
  var evt = args[0]
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

if (ADD_EVENT_LISTENER in window.performance) {
  if (window.performance['c' + learResourceTimings]) {
    window.performance[ADD_EVENT_LISTENER](RESOURCE_TIMING_BUFFER_FULL, function (e) {
      handle(BST_RESOURCE, [window.performance.getEntriesByType(RESOURCE)])
      window.performance['c' + learResourceTimings]()
    }, false)
  } else {
    window.performance[ADD_EVENT_LISTENER]('webkit' + RESOURCE_TIMING_BUFFER_FULL, function (e) {
      handle(BST_RESOURCE, [window.performance.getEntriesByType(RESOURCE)])
      window.performance['webkitC' + learResourceTimings]()
    }, false)
  }
}

document[ADD_EVENT_LISTENER]('scroll', noOp, {passive: true})
document[ADD_EVENT_LISTENER]('keypress', noOp, false)
document[ADD_EVENT_LISTENER]('click', noOp, false)

function noOp (e) { /* no-op */ }
