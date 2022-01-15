/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var ee = require('../contextual-ee').global.get('fetch')
var slice = require('lodash._slice')
var mapOwn = require('../map-own')

module.exports = ee
module.exports.wrap = wrapFetch
module.exports.wrapGlobal = wrapGlobal

var win = window
var prefix = 'fetch-'
var bodyPrefix = prefix + 'body-'
var bodyMethods = ['arrayBuffer', 'blob', 'json', 'text', 'formData']
var Req = win.Request
var Res = win.Response
var fetch = win.fetch
var proto = 'prototype'
var ctxId = 'nr@context'

function wrapGlobal() {
  // since these are prototype methods, we can only wrap globally
  mapOwn(bodyMethods, function (i, name) {
    wrapPromiseMethod(ee, Req[proto], name, bodyPrefix)
    wrapPromiseMethod(ee, Res[proto], name, bodyPrefix)
  })

  var wrappedFetch = wrapFetch(ee)
  win.fetch = wrappedFetch
}

function wrapFetch(ee) {
  var fn = NREUM.o.FETCH

  var wrappedFetch = wrapPromiseMethod(ee, fn, prefix)

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

  return wrappedFetch
}

// this should probably go to the common module as a part of wrapping utility functions
function wrapPromiseMethod(ee, fn, prefix) {
  return function nrWrapper() {
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
