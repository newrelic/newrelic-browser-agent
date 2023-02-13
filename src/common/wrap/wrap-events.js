/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * This module is used directly by: session_trace
 * It is also called by -> wrapXhr <-, so see "wrap-xhr.js" for featuers that uses this indirectly.
 */
import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn, unwrapFunction } from './wrap-function'
import { getOrSet } from '../util/get-or-set'
import { globalScope, isBrowserScope } from '../util/global-scope'

const wrapped = {}
const XHR = XMLHttpRequest
const ADD_EVENT_LISTENER = 'addEventListener'
const REMOVE_EVENT_LISTENER = 'removeEventListener'

export function wrapEvents (sharedEE) {
  var ee = scopedEE(sharedEE)
  if (wrapped[ee.debugId]++) // Notice if our wrapping never ran yet, the falsey NaN will not early return; but if it has,
  { return ee } // then we increment the count to track # of feats using this at runtime.
  wrapped[ee.debugId] = 1

  var wrapFn = wfn(ee, true)

  // Guard against instrumenting environments w/o necessary features
  if ('getPrototypeOf' in Object) {
    if (isBrowserScope)
    { findEventListenerProtoAndCb(document, wrapNode) }
    findEventListenerProtoAndCb(globalScope, wrapNode)
    findEventListenerProtoAndCb(XHR.prototype, wrapNode)
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

export function unwrapEvents (sharedEE) {
  const ee = scopedEE(sharedEE)

  // Don't unwrap until the LAST of all features that's using this (wrapped count) no longer needs this.
  if (wrapped[ee.debugId] == 1) {
    [ADD_EVENT_LISTENER, REMOVE_EVENT_LISTENER].forEach(fn => {
      if (typeof document === 'object') findEventListenerProtoAndCb(document, unwrapFunction, fn) //==> unwrapFunction(findProto(document)?, fn);
      findEventListenerProtoAndCb(globalScope, unwrapFunction, fn)
      findEventListenerProtoAndCb(XHR.prototype, unwrapFunction, fn)
    })
    wrapped[ee.debugId] = Infinity // rather than leaving count=0, make this marker perma-truthy to prevent re-wrapping by this agent (unsupported)
  } else {
    wrapped[ee.debugId]--
  }
}
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('events')
}
