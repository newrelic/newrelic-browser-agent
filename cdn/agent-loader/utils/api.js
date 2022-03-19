/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import slice from 'lodash._slice'
import { gosNREUM } from '../../../modules/common/window/nreum'
// import { global as handle } from '../../../modules/common/event-emitter/handle'
import { handle } from '../../../modules/common/event-emitter/handle'
import { mapOwn } from '../../../modules/common/util/map-own'
// import { global as globalEE } from '../../../modules/common/event-emitter/contextual-ee'
import { ee } from '../../../modules/common/event-emitter/contextual-ee'
import { recordSupportability } from '../../../modules/common/metrics/metrics'
import { now } from '../../../modules/common/timing/now'

export function setAPI() {
  var nr = gosNREUM()
  var tracerEE = ee.get('tracer')

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

  nr.interaction = function () {
    return new InteractionHandle().get()
  }

  function InteractionHandle() { }

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

  mapOwn('actionText,setName,setAttribute,save,ignore,onEnd,getContext,end,get'.split(','), function addApi(n, name) {
    InteractionApiProto[name] = apiCall(spaPrefix, name)
  })

  function apiCall(prefix, name, notSpa, bufferGroup) {
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
}
