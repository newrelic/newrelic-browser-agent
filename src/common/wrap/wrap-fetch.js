/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * This module is used by: ajax, spa
 */
import { ee as baseEE } from '../event-emitter/contextual-ee'
import slice from 'lodash._slice'
import { globalScope } from '../util/global-scope'
import { flag, unwrapFunction } from './wrap-function'

var prefix = 'fetch-'
var bodyPrefix = prefix + 'body-'
var bodyMethods = ['arrayBuffer', 'blob', 'json', 'text', 'formData']
var Req = globalScope.Request
var Res = globalScope.Response
var proto = 'prototype'
var ctxId = 'nr@context'

const wrapped = {}

export function wrapFetch (sharedEE) {
  const ee = scopedEE(sharedEE)
  if (!(Req && Res && globalScope.fetch)) {
    return ee
  }

  if (wrapped[ee.debugId]++) // Notice if our wrapping never ran yet, the falsey NaN will not early return; but if it has,
  { return ee } // then we increment the count to track # of feats using this at runtime.
  wrapped[ee.debugId] = 1

  bodyMethods.forEach(method => {
    wrapPromiseMethod(Req[proto], method, bodyPrefix)
    wrapPromiseMethod(Res[proto], method, bodyPrefix)
  })
  wrapPromiseMethod(globalScope, 'fetch', prefix)

  ee.on(prefix + 'end', function (err, res) {
    var ctx = this
    if (res) {
      var size = res.headers.get('content-length')
      if (size !== null) {
        ctx.rxSize = size
      }
      ee.emit(prefix + 'done', [null, res], ctx)
    } else {
      ee.emit(prefix + 'done', [err], ctx)
    }
  })

  function wrapPromiseMethod (target, name, prefix) {
    var fn = target[name]
    if (typeof fn === 'function') {
      target[name] = function () {
        var args = slice(arguments)

        var ctx = {}
        // we are wrapping args in an array so we can preserve the reference
        ee.emit(prefix + 'before-start', [args], ctx)
        var dtPayload
        if (ctx[ctxId] && ctx[ctxId].dt) dtPayload = ctx[ctxId].dt

        var origPromiseFromFetch = fn.apply(this, args)

        ee.emit(prefix + 'start', [args, dtPayload], origPromiseFromFetch)

        // Note we need to cast the returned (orig) Promise from native APIs into the current global Promise, which may or may not be our WrappedPromise.
        return origPromiseFromFetch.then(function (val) {
          ee.emit(prefix + 'end', [null, val], origPromiseFromFetch)
          return val
        }, function (err) {
          ee.emit(prefix + 'end', [err], origPromiseFromFetch)
          throw err
        })
      }
      target[name][flag] = fn // track original similar to in wrap-function.js, so that they can be unwrapped with ease
    }
  }

  return ee
}
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('fetch')
}
