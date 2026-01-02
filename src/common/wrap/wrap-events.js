/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Wraps `addEventListener` and `removeEventListener` for instrumentation.
 * This module is used directly by: session_trace.
 * It is also called by -> wrapXhr <-, so see "wrap-xhr.js" for features that use this indirectly.
 */
import { ee as baseEE, contextId } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn } from './wrap-function'
import { getOrSet } from '../util/get-or-set'
import { globalScope, isBrowserScope } from '../constants/runtime'

const wrapped = {}
const XHR = globalScope.XMLHttpRequest
const ADD_EVENT_LISTENER = 'addEventListener'
const REMOVE_EVENT_LISTENER = 'removeEventListener'
const flag = `nr@wrapped:${contextId}`

/**
 * Wraps `addEventListener` and `removeEventListener` on: global scope; the prototype of `XMLHttpRequest`, and
 * `document` (if in a browser scope). Adds custom events in context of a new emitter scoped only to these methods.
 * @param {Object} sharedEE - The shared event emitter on which a new scoped
 *     event emitter will be based.
 * @returns {Object} Scoped event emitter with a debug ID of `events`.
 */
export function wrapEvents (sharedEE) {
  var ee = scopedEE(sharedEE)

  // Notice if our wrapping never ran yet, the falsy NaN will not early return; but if it has,
  // then we increment the count to track # of feats using this at runtime.
  if (wrapped[ee.debugId]++) return ee
  wrapped[ee.debugId] = 1 // otherwise, first feature to wrap events
  var wrapFn = wfn(ee, true)

  // Guard against instrumenting environments w/o necessary features
  if ('getPrototypeOf' in Object) {
    if (isBrowserScope) findEventListenerProtoAndCb(document, wrapNode)
    if (XHR) findEventListenerProtoAndCb(XHR.prototype, wrapNode)
    findEventListenerProtoAndCb(globalScope, wrapNode)
  }

  ee.on(ADD_EVENT_LISTENER + '-start', function (args, target) {
    var originalListener = args[1]
    if (originalListener === null ||
      (typeof originalListener !== 'function' && typeof originalListener !== 'object') ||
      (args[0] === 'newrelic') // ignore our own window events
    ) {
      return
    }

    var wrapped = getOrSet(originalListener, flag, function () {
      var listener = {
        object: wrapHandleEvent,
        function: originalListener
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

  function wrapNode (node) {
    wrapFn.inPlace(node, [ADD_EVENT_LISTENER, REMOVE_EVENT_LISTENER], '-', uniqueListener)
  }

  function uniqueListener (args, obj) {
    // Context for the listener is stored on itself.
    return args[1]
  }

  return ee
}
/**
 * Find the base prototype of 'object' that has its own "addEventListener" property, and run some function on it.
 * @param {Object} object - the initial object to traverse prototype chain on
 * @param {Function} cb - the function to run on the ancestral object once found, accepts an object as a arg
 * @param {Array} rest - [optional] any additional arguments to pass to the cb
 */
function findEventListenerProtoAndCb (object, cb, ...rest) {
  let step = object
  while (typeof step === 'object' && !Object.prototype.hasOwnProperty.call(step, ADD_EVENT_LISTENER)) {
    step = Object.getPrototypeOf(step)
  }
  if (step) cb(step, ...rest)
}

/**
 * Returns an event emitter scoped specifically for the `events` context. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter.
 *     Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'events'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('events')
}
