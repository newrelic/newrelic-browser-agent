/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {eventListenerOpts} from '../event-listener/event-listener-opts'
import {ee as baseEE} from '../event-emitter/contextual-ee'
import {createWrapperWithEmitter as wfn} from './wrap-function'

const wrapped = {}

export function wrapJsonP(sharedEE){
  const ee = scopedEE(sharedEE)
  if (wrapped[ee.debugId]) return ee
  wrapped[ee.debugId] = true
  var wrapFn = wfn(ee)
  
  var CALLBACK_REGEX = /[?&](?:callback|cb)=([^&#]+)/
  var PARENT_REGEX = /(.*)\.([^.]+)/
  var VALUE_REGEX = /^(\w+)(\.|$)(.*)$/
  var domInsertMethods = ['appendChild', 'insertBefore', 'replaceChild']
  
  if (shouldWrap()) {
    wrap()
  }
  
  function wrap() {
    // JSONP works by dynamically inserting <script> elements - wrap DOM methods for
    // inserting elements to detect insertion of JSONP-specific elements.
    if (Node && Node.prototype && Node.prototype.appendChild) {
      wrapFn.inPlace(Node.prototype, domInsertMethods, 'dom-')
    } else {
      wrapFn.inPlace(HTMLElement.prototype, domInsertMethods, 'dom-')
      wrapFn.inPlace(HTMLHeadElement.prototype, domInsertMethods, 'dom-')
      wrapFn.inPlace(HTMLBodyElement.prototype, domInsertMethods, 'dom-')
    }
  }
  
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
  
  function shouldWrap () {
    return 'addEventListener' in window
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

export function scopedEE(sharedEE){
  return (sharedEE || baseEE).get('jsonp')
}