/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var handle = require('handle')
var mapOwn = require('map-own')
var slice = require('lodash._slice')
var tracerEE = require('ee').get('tracer')
var loader = require('loader')

var nr = NREUM
if (typeof (window.newrelic) === 'undefined') newrelic = nr

var asyncApiFns = [
  'setPageViewName',
  'setCustomAttribute',
  'setErrorHandler',
  'finished',
  'addToTrace',
  'inlineHit',
  'addRelease'
]

var prefix = 'api-'
var spaPrefix = prefix + 'ixn-'

// Setup stub functions that queue calls for later processing.
mapOwn(asyncApiFns, function (num, fnName) {
  nr[fnName] = apiCall(prefix + fnName, true, 'api')
})

nr.addPageAction = apiCall(prefix + 'addPageAction', true)
nr.setCurrentRouteName = apiCall(prefix + 'routeName', true)

module.exports = newrelic

nr.interaction = function () {
  return new InteractionHandle().get()
}

function InteractionHandle () {}

var InteractionApiProto = InteractionHandle.prototype = {
  createTracer: function (name, cb) {
    var contextStore = {}
    var ixn = this
    var hasCb = typeof cb === 'function'
    handle(spaPrefix + 'tracer', [loader.now(), name, contextStore], ixn)
    return function () {
      tracerEE.emit((hasCb ? '' : 'no-') + 'fn-start', [loader.now(), ixn, hasCb], contextStore)
      if (hasCb) {
        try {
          return cb.apply(this, arguments)
        } catch (err) {
          tracerEE.emit('fn-err', [arguments, this, err], contextStore)
          // the error came from outside the agent, so don't swallow
          throw err
        } finally {
          tracerEE.emit('fn-end', [loader.now()], contextStore)
        }
      }
    }
  }
}

mapOwn('actionText,setName,setAttribute,save,ignore,onEnd,getContext,end,get'.split(','), function addApi (n, name) {
  InteractionApiProto[name] = apiCall(spaPrefix + name)
})

function apiCall (name, notSpa, bufferGroup) {
  return function () {
    handle(name, [loader.now()].concat(slice(arguments)), notSpa ? null : this, bufferGroup)
    return notSpa ? void 0 : this
  }
}

newrelic.noticeError = function (err, customAttributes) {
  if (typeof err === 'string') err = new Error(err)
  handle('err', [err, loader.now(), false, customAttributes])
}
