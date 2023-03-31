/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Wraps AJAX (XHR) related methods for instrumentation.
 * This module is used by: ajax, jserrors, spa.
 */

import { wrapEvents, unwrapEvents } from './wrap-events'
import { ee as contextualEE } from '../event-emitter/contextual-ee'
import { eventListenerOpts } from '../event-listener/event-listener-opts'
import { createWrapperWithEmitter as wfn, unwrapFunction } from './wrap-function'
import { originals } from '../config/config'
import { globalScope } from '../util/global-scope'
import { warn } from '../util/console'

const wrapped = {}
const XHR_PROPS = ['open', 'send'] // these are the specific funcs being wrapped on all XMLHttpRequests(.prototype)

/**
 * Wraps the native XMLHttpRequest (XHR) object to emit custom events to its readystatechange event and an assortment
 * of handlers. Adds instrumentation in context of a new event emitter scoped only to XHR.
 * @param {Object} sharedEE - The shared event emitter on which a new scoped event emitter will be based.
 * @returns {Object} Scoped event emitter with a debug ID of `xhr`.
 */
// eslint-disable-next-line
export function wrapXhr (sharedEE) {
  var baseEE = sharedEE || contextualEE
  const ee = scopedEE(baseEE)

  if (wrapped[ee.debugId]++) // Notice if our wrapping never ran yet, the falsey NaN will not early return; but if it has,
  { return ee } // then we increment the count to track # of feats using this at runtime.
  wrapped[ee.debugId] = 1 // <- otherwise, first feature to wrap XHR

  wrapEvents(baseEE) // wrap-events patches XMLHttpRequest.prototype.addEventListener for us
  var wrapFn = wfn(ee)

  var OrigXHR = originals.XHR
  var MutationObserver = originals.MO
  var Promise = originals.PR
  var setImmediate = originals.SI

  var READY_STATE_CHANGE = 'readystatechange'

  var handlers = ['onload', 'onerror', 'onabort', 'onloadstart', 'onloadend', 'onprogress', 'ontimeout']
  var pendingXhrs = []

  var activeListeners = globalScope.XMLHttpRequest.listeners

  var XHR = globalScope.XMLHttpRequest = newXHR

  function newXHR (opts) {
    var xhr = new OrigXHR(opts)
    this.listeners = activeListeners ? [...activeListeners, intercept] : [intercept]
    function intercept () {
      try {
        ee.emit('new-xhr', [xhr], xhr)
        xhr.addEventListener(READY_STATE_CHANGE, wrapXHR, eventListenerOpts(false))
      } catch (e) {
        warn('An error occured while intercepting XHR', e)
        try {
          ee.emit('internal-error', [e])
        } catch (err) {
          // do nothing
        }
      }
    }
    this.listeners.forEach(listener => listener())
    return xhr
  }

  copy(OrigXHR, XHR)

  XHR.prototype = OrigXHR.prototype

  wrapFn.inPlace(XHR.prototype, XHR_PROPS, '-xhr-', getObject)

  ee.on('send-xhr-start', function (args, xhr) {
    wrapOnreadystatechange(args, xhr)
    enqueuePendingXhr(xhr)
  })
  ee.on('open-xhr-start', wrapOnreadystatechange)

  function wrapOnreadystatechange (args, xhr) {
    wrapFn.inPlace(xhr, ['onreadystatechange'], 'fn-', getObject)
  }

  function wrapXHR () {
    var xhr = this
    var ctx = ee.context(xhr)

    if (xhr.readyState > 3 && !ctx.resolved) {
      ctx.resolved = true
      ee.emit('xhr-resolved', [], xhr)
    }

    wrapFn.inPlace(xhr, handlers, 'fn-', getObject)
  }

  // Wrapping the onreadystatechange property of XHRs takes some special tricks.
  //
  // The issue is that the onreadystatechange property may be assigned *after*
  // send() is called against an XHR. This is of particular importance because
  // jQuery uses a single onreadystatechange handler to implement all of the XHR
  // callbacks thtat it provides, and it assigns that property after calling send.
  //
  // There are several 'obvious' approaches to wrapping the onreadystatechange
  // when it's assigned after send:
  //
  // 1. Try to wrap the onreadystatechange handler from a readystatechange
  //    addEventListener callback (the addEventListener callback will fire before
  //    the onreadystatechange callback).
  //
  //      Caveat: this doesn't work in Chrome or Safari, and in fact will cause
  //      the onreadystatechange handler to not be invoked at all during the
  //      firing cycle in which it is wrapped, which may break applications :(
  //
  // 2. Use Object.defineProperty to create a setter for the onreadystatechange
  //    property, and wrap from that setter.
  //
  //      Caveat: onreadystatechange is not a configurable property in Safari or
  //      older versions of the Android browser.
  //
  // 3. Schedule wrapping of the onreadystatechange property using a setTimeout
  //    call issued just before the call to send.
  //
  //      Caveat: sometimes, the onreadystatechange handler fires before the
  //      setTimeout, meaning the wrapping happens too late.
  //
  // The setTimeout approach is closest to what we use here: we want to schedule
  // the wrapping of the onreadystatechange property when send is called, but
  // ensure that our wrapping happens before onreadystatechange has a chance to
  // fire.
  //
  // We achieve this using a hybrid approach:
  //
  // * In browsers that support MutationObserver, we use that to schedule wrapping
  //   of onreadystatechange.
  //
  // * We have discovered that MutationObserver in IE causes a memory leak, so we
  //   now will prefer setImmediate for IE, and use a resolved promise to schedule
  //   the wrapping in Edge (and other browsers that support promises)
  //
  // * In older browsers that don't support MutationObserver, we rely on the fact
  //   that the call to send is probably happening within a callback that we've
  //   already wrapped, and use our existing fn-end event callback to wrap the
  //   onreadystatechange at the end of the current callback.
  //

  if (MutationObserver) {
    var resolved = Promise && Promise.resolve()
    if (!setImmediate && !Promise) {
      var toggle = 1
      var dummyNode = document.createTextNode(toggle)
      new MutationObserver(drainPendingXhrs).observe(dummyNode, { characterData: true })
    }
  } else { // this below case applies to web workers too
    baseEE.on('fn-end', function (args) {
      // We don't want to try to wrap onreadystatechange from within a
      // readystatechange callback.
      if (args[0] && args[0].type === READY_STATE_CHANGE) return
      drainPendingXhrs()
    })
  }

  function enqueuePendingXhr (xhr) {
    pendingXhrs.push(xhr)
    if (MutationObserver) {
      if (resolved) {
        resolved.then(drainPendingXhrs)
      } else if (setImmediate) {
        setImmediate(drainPendingXhrs)
      } else {
        toggle = -toggle
        dummyNode.data = toggle
      }
    }
  }

  function drainPendingXhrs () {
    for (var i = 0; i < pendingXhrs.length; i++) {
      wrapOnreadystatechange([], pendingXhrs[i])
    }
    if (pendingXhrs.length) pendingXhrs = []
  }

  // Use the object these methods are on as their
  // context store for the event emitter
  function getObject (args, obj) {
    return obj
  }

  function copy (from, to) {
    for (var i in from) {
      to[i] = from[i]
    }
    return to
  }

  return ee
}

/**
 * Returns an event emitter scoped specifically for the `xhr` context. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter.
 *     Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'xhr'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || contextualEE).get('xhr')
}
