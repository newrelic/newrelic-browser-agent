/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Wraps DOM insertion methods which in turn wrap JSONP functions that show up in the DOM.
 * This module is used by: spa.
 */

import { eventListenerOpts } from '../event-listener/event-listener-opts'
import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn, unwrapFunction } from './wrap-function'
import { isBrowserScope } from '../util/global-scope'

const wrapped = {}
const domInsertMethods = ['appendChild', 'insertBefore', 'replaceChild']

/**
 * Wraps DOM insertion methods to identify script elements containing JSONP callback functions and instruments those
 * functions with custom events in the context of a new event emitter scoped only to JSONP.
 * @param {Object} sharedEE - The shared event emitter on which a new scoped event emitter will be based.
 * @returns {Object} Scoped event emitter with a debug ID of `jsonp`.
 */
export function wrapJsonP (sharedEE) {
  const ee = scopedEE(sharedEE)

  if (!isBrowserScope || wrapped[ee.debugId]) // JSONP deals with DOM tags so browser window env is req'd
  { return ee }
  wrapped[ee.debugId] = true

  var wrapFn = wfn(ee)

  var CALLBACK_REGEX = /[?&](?:callback|cb)=([^&#]+)/
  var PARENT_REGEX = /(.*)\.([^.]+)/
  var VALUE_REGEX = /^(\w+)(\.|$)(.*)$/

  // JSONP works by dynamically inserting <script> elements - wrap DOM methods for
  // inserting elements to detect insertion of JSONP-specific elements.
  wrapFn.inPlace(Node.prototype, domInsertMethods, 'dom-')

  ee.on('dom-start', function (args) {
    wrapElement(args[0])
  })

  // subscribe to events on the JSONP <script> element and wrap the JSONP callback
  // in order to track start and end of the interaction node
  function wrapElement (el) {
    var isScript = el && typeof el.nodeName === 'string' &&
      el.nodeName.toLowerCase() === 'script'
    if (!isScript) return

    var isValidElement = typeof el.addEventListener === 'function'
    if (!isValidElement) return

    var callbackName = extractCallbackName(el.src)
    if (!callbackName) return

    var callback = discoverParent(callbackName)
    var validCallback = typeof callback.parent[callback.key] === 'function'
    if (!validCallback) return

    // At this point we know that the element is a valid JSONP script element.
    // The following events are emitted during the lifetime of a JSONP call:
    // * immediately emit `new-jsonp` to notify start of the JSONP work
    // * the wrapped callback will emit `cb-start` and `cb-end` during the execution
    //   of the callback, here we can inspect the response
    // * when the element emits the `load` event (script loaded and executed),
    //   emit `jsonp-end` to notify end of the JSONP work
    // * if the element emits the `error` event, in response emit `jsonp-error`
    //   (and `jsonp-end`). Note that the callback in this case will likely not get
    //   called.

    var context = {}
    wrapFn.inPlace(callback.parent, [callback.key], 'cb-', context)

    el.addEventListener('load', onLoad, eventListenerOpts(false))
    el.addEventListener('error', onError, eventListenerOpts(false))
    ee.emit('new-jsonp', [el.src], context)

    function onLoad () {
      ee.emit('jsonp-end', [], context)
      el.removeEventListener('load', onLoad, eventListenerOpts(false))
      el.removeEventListener('error', onError, eventListenerOpts(false))
    }

    function onError () {
      ee.emit('jsonp-error', [], context)
      ee.emit('jsonp-end', [], context)
      el.removeEventListener('load', onLoad, eventListenerOpts(false))
      el.removeEventListener('error', onError, eventListenerOpts(false))
    }
  }

  function extractCallbackName (src) {
    var matches = src.match(CALLBACK_REGEX)
    return matches ? matches[1] : null
  }

  function discoverValue (longKey, obj) {
    var matches = longKey.match(VALUE_REGEX)
    var key = matches[1]
    var remaining = matches[3]
    if (!remaining) {
      return obj[key]
    }
    return discoverValue(remaining, obj[key])
  }

  function discoverParent (key) {
    var matches = key.match(PARENT_REGEX)
    if (matches && matches.length >= 3) {
      return {
        key: matches[2],
        parent: discoverValue(matches[1], window)
      }
    }
    return {
      key: key,
      parent: window
    }
  }
  return ee
}

/**
 * Returns an event emitter scoped specifically for the `jsonp` context. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter.
 *     Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'jsonp'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('jsonp')
}
