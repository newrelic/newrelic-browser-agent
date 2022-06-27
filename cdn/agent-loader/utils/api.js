/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import slice from 'lodash._slice'
import { gosNREUM } from '@newrelic/browser-agent-core/common/window/nreum'
import { handle } from '@newrelic/browser-agent-core/common/event-emitter/handle'
import { mapOwn } from '@newrelic/browser-agent-core/common/util/map-own'
import { ee } from '@newrelic/browser-agent-core/common/event-emitter/contextual-ee'
import { now } from '@newrelic/browser-agent-core/common/timing/now'
import { getInfo } from '@newrelic/browser-agent-core/common/config/config'
import agentIdentifier from '../../shared/agentIdentifier'

export function setAPI() {
  var nr = gosNREUM()
  var instanceEE = ee.get(agentIdentifier)
  var tracerEE = instanceEE.get('tracer')

  var asyncApiFns = [
    'setPageViewName',
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
      handle(spaPrefix + 'tracer', [now(), name, contextStore], ixn, undefined, instanceEE)
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
      handle('record-supportability', ['API/' + name + '/called'])
      handle(prefix + name, [now()].concat(slice(arguments)), notSpa ? null : this, bufferGroup, instanceEE)
      return notSpa ? void 0 : this
    }
  }

  // 06.22 Test migration: removed 'setCustomAttribute' from our EE model due to race cond btwn page-action and page-view-event aggs
  nr.setCustomAttribute = function (key, value) {
    handle('record-supportability', ['API/setCustomAttribute/called'])
    getInfo(agentIdentifier).jsAttributes[key] = value;
  }

  nr.noticeError = function (err, customAttributes) {
    if (typeof err === 'string') err = new Error(err)
    handle('record-supportability', ['API/noticeError/called'])
    handle('err', [err, now(), false, customAttributes], undefined, undefined, instanceEE)
  }

  nr.BrowserAgentInstance = async function (){
    const { BrowserAgent } = await import('@newrelic/browser-agent')
    return new BrowserAgent()
  }
}
