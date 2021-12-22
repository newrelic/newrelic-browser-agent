/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var ee = require('./contextual-ee').global.get('events')
var wrapFn = require('./wrap-function')(ee, true)
var getOrSet = require('./get-or-set')

var XHR = XMLHttpRequest
var ADD_EVENT_LISTENER = 'addEventListener'
var REMOVE_EVENT_LISTENER = 'removeEventListener'

module.exports = ee

// Guard against instrumenting environments w/o necessary features
if ('getPrototypeOf' in Object) {
  findAndWrapNode(document)
  findAndWrapNode(window)
  findAndWrapNode(XHR.prototype)
} else if (XHR.prototype.hasOwnProperty(ADD_EVENT_LISTENER)) {
  wrapNode(window)
  wrapNode(XHR.prototype)
}

ee.on(ADD_EVENT_LISTENER + '-start', function (args, target) {
  var originalListener = args[1]
  if (originalListener === null ||
    (typeof originalListener !== 'function' && typeof originalListener !== 'object')
  ) {
    return
  }

  var wrapped = getOrSet(originalListener, 'nr@wrapped', function () {
    var listener = {
      object: wrapHandleEvent,
      'function': originalListener
    }[typeof originalListener]

    return listener ? wrapFn(listener, 'fn-', null, (listener.name || 'anonymous')) : originalListener

    function wrapHandleEvent () {
      if (typeof originalListener.handleEvent !== 'function') return
      return originalListener.handleEvent.apply(originalListener, arguments)
    }
  })

  this.wrapped = args[1] = wrapped
})

ee.on(REMOVE_EVENT_LISTENER + '-start', function (args) {
  args[1] = this.wrapped || args[1]
})

function findAndWrapNode (object) {
  var step = object
  while (step && !step.hasOwnProperty(ADD_EVENT_LISTENER)) { step = Object.getPrototypeOf(step) }
  if (step) { wrapNode(step) }
}

function wrapNode (node) {
  wrapFn.inPlace(node, [ADD_EVENT_LISTENER, REMOVE_EVENT_LISTENER], '-', uniqueListener)
}

function uniqueListener (args, obj) {
  // Context for the listener is stored on itself.
  return args[1]
}
