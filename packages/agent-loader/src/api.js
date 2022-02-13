/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { global as handle } from 'nr-browser-common/src/event-emitter/handle'
import { mapOwn } from 'nr-browser-common/src/util/map-own'
import { global as globalEE } from 'nr-browser-common/src/event-emitter/contextual-ee'
import { recordSupportability } from 'nr-browser-common/src/metrics/metrics'
import { now } from 'nr-browser-common/src/timing/now'
import slice from 'lodash._slice'

var tracerEE = globalEE.get('tracer')

var nr = NREUM
if (typeof (window.newrelic) === 'undefined') window.newrelic = nr

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
  nr[fnName] = apiCall(prefix, fnName, true, 'api')
})

nr.addPageAction = apiCall(prefix, 'addPageAction', true)
nr.setCurrentRouteName = apiCall(prefix, 'routeName', true)

export default newrelic

nr.interaction = function () {
  return new InteractionHandle().get()
}

function InteractionHandle () {}

var InteractionApiProto = InteractionHandle.prototype = {
  createTracer: function (name, cb) {
    var contextStore = {}
    var ixn = this
    var hasCb = typeof cb === 'function'
    handle(spaPrefix + 'tracer', [now(), name, contextStore], ixn)
    return function () {
      tracerEE.emit((hasCb ? '' : 'no-') + 'fn-start', [now(), ixn, hasCb], contextStore)
      if (hasCb) {
        try {
          return cb.apply(this, arguments)
        } catch (err) {
          tracerEE.emit('fn-err', [arguments, this, err], contextStore)
          // the error came from outside the agent, so don't swallow
          throw err
        } finally {
          tracerEE.emit('fn-end', [now()], contextStore)
        }
      }
    }
  }
}

mapOwn('actionText,setName,setAttribute,save,ignore,onEnd,getContext,end,get'.split(','), function addApi (n, name) {
  InteractionApiProto[name] = apiCall(spaPrefix, name)
})

function apiCall (prefix, name, notSpa, bufferGroup) {
  return function () {
    recordSupportability('API/' + name + '/called')
    handle(prefix + name, [now()].concat(slice(arguments)), notSpa ? null : this, bufferGroup)
    return notSpa ? void 0 : this
  }
}

newrelic.noticeError = function (err, customAttributes) {
  if (typeof err === 'string') err = new Error(err)
  recordSupportability('API/noticeError/called')
  handle('err', [err, now(), false, customAttributes])
}
