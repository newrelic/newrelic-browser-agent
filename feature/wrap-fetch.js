/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var ee = require('ee').get('fetch')
var slice = require('lodash._slice')
var mapOwn = require('map-own')

module.exports = ee

var win = window
var prefix = 'fetch-'
var bodyPrefix = prefix + 'body-'
var bodyMethods = ['arrayBuffer', 'blob', 'json', 'text', 'formData']
var Req = win.Request
var Res = win.Response
var fetch = win.fetch
var proto = 'prototype'
var ctxId = 'nr@context'

if (!(Req && Res && fetch)) {
  return
}

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
