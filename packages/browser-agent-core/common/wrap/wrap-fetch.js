/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {ee as baseEE} from '../event-emitter/contextual-ee'
import slice from 'lodash._slice'
import {mapOwn} from '../util/map-own'
import { originals } from '../config/config'


var win = window
var prefix = 'fetch-'
var bodyPrefix = prefix + 'body-'
var bodyMethods = ['arrayBuffer', 'blob', 'json', 'text', 'formData']
var Req = win.Request
var Res = win.Response
var proto = 'prototype'
var ctxId = 'nr@context'

const wrapped = {}

export function wrapFetch(sharedEE){
  const ee = scopedEE(sharedEE)
  if (!(Req && Res && window.fetch)) {
    return ee
  }

  if (wrapped[ee.debugId]) return ee
  wrapped[ee.debugId] = true
  
  mapOwn(bodyMethods, function (i, name) {
    wrapPromiseMethod(Req[proto], name, bodyPrefix)
    wrapPromiseMethod(Res[proto], name, bodyPrefix)
  })
  
  wrapPromiseMethod(win, 'fetch', prefix)
  
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
  
        var promise = fn.apply(this, args)
  
        ee.emit(prefix + 'start', [args, dtPayload], promise)
  
        return promise.then(function (val) {
          ee.emit(prefix + 'end', [null, val], promise)
          return val
        }, function (err) {
          ee.emit(prefix + 'end', [err], promise)
          throw err
        })
      }
    }
  }

  return ee
}

export function scopedEE(sharedEE){
  return (sharedEE || baseEE).get('fetch')
}