/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import slice from 'lodash._slice'
import { getRuntime, setInfo, getInfo, getConfigurationValue } from '@newrelic/browser-agent-core/src/common/config/config'
import { handle } from '@newrelic/browser-agent-core/src/common/event-emitter/handle'
import { mapOwn } from '@newrelic/browser-agent-core/src/common/util/map-own'
import { ee } from '@newrelic/browser-agent-core/src/common/event-emitter/contextual-ee'
import { now } from '@newrelic/browser-agent-core/src/common/timing/now'
import { single } from '@newrelic/browser-agent-core/src/common/util/single'
import { registerHandler } from '@newrelic/browser-agent-core/src/common/event-emitter/register-handler'
import { submitData } from '@newrelic/browser-agent-core/src/common/util/submit-data'
import { isBrowserWindow } from '@newrelic/browser-agent-core/src/common/window/win'

function setTopLevelCallers(nr) {
  const funcs = [
    'setErrorHandler', 'finished', 'addToTrace', 'inlineHit', 'addRelease',
    'addPageAction', 'setCurrentRouteName', 'setPageViewName', 'setCustomAttribute',
    'interaction', 'noticeError'
  ]
  funcs.forEach(f => {
    nr[f] = (...args) => caller(f, ...args)
  })

  function caller(fnName, ...args) {
    Object.values(nr.initializedAgents).forEach(val => {
      if (val.exposed && val.api[fnName]) val.api[fnName](...args)
    })
  }
}

export function setAPI(agentIdentifier, nr) {
  setTopLevelCallers(nr)
  var instanceEE = ee.get(agentIdentifier)
  var tracerEE = instanceEE.get('tracer')

  var asyncApiFns = [
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

  nr.setPageViewName = function (name, host) {
    if (typeof name !== 'string') return
    if (name.charAt(0) !== '/') name = '/' + name
    getRuntime(agentIdentifier).customTransaction = (host || 'http://custom.transaction') + name
    return apiCall(prefix, 'setPageViewName', true, 'api')()
  }

  nr.setCustomAttribute = function (name, value) {
    const currentInfo = getInfo(agentIdentifier)
    setInfo(agentIdentifier, { ...currentInfo, jsAttributes: { ...currentInfo.jsAttributes, [name]: value } })
    return apiCall(prefix, 'setCustomAttribute', true, 'api')()
  }

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
            tracerEE.emit('fn-err', [arguments, this, typeof err == 'string' ? new Error(err) : err], contextStore)
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
      handle('record-supportability', ['API/' + name + '/called'], undefined, undefined, instanceEE)
      handle(prefix + name, [now()].concat(slice(arguments)), notSpa ? null : this, bufferGroup, instanceEE)
      return notSpa ? void 0 : this
    }
  }

  nr.noticeError = function (err, customAttributes) {
    if (typeof err === 'string') err = new Error(err)
    handle('record-supportability', ['API/noticeError/called'], undefined, undefined, instanceEE)
    handle('err', [err, now(), false, customAttributes], undefined, undefined, instanceEE)
  }

  var cycle = 0

  var scheme = (getConfigurationValue(agentIdentifier, 'ssl') === false) ? 'http' : 'https'

  var api = {
    finished: single(finished),
    setErrorHandler: setErrorHandler,
    addToTrace: addToTrace,
    inlineHit: inlineHit,
    addRelease: addRelease
  }

  // Hook all of the api functions up to the queues/stubs created in loader/api.js
  mapOwn(api, function (fnName, fn) {
    registerHandler('api-' + fnName, fn, 'api', instanceEE)
  })

  // All API functions get passed the time they were called as their
  // first parameter. These functions can be called asynchronously.


  function finished(t, providedTime) {
    var time = providedTime ? providedTime - getRuntime(agentIdentifier).offset : t
    handle('record-custom', ['finished', { time }], undefined, undefined, instanceEE)
    addToTrace(t, { name: 'finished', start: time + getRuntime(agentIdentifier).offset, origin: 'nr' })
    handle('api-addPageAction', [time, 'finished'], undefined, undefined, instanceEE)
  }

  function addToTrace(t, evt) {
    if (!(evt && typeof evt === 'object' && evt.name && evt.start)) return

    var report = {
      n: evt.name,
      s: evt.start - getRuntime(agentIdentifier).offset,
      e: (evt.end || evt.start) - getRuntime(agentIdentifier).offset,
      o: evt.origin || '',
      t: 'api'
    }

    handle('bstApi', [report], undefined, undefined, instanceEE)
  }

  // NREUM.inlineHit(request_name, queue_time, app_time, total_be_time, dom_time, fe_time)
  //
  // request_name - the 'web page' name or service name
  // queue_time - the amount of time spent in the app tier queue
  // app_time - the amount of time spent in the application code
  // total_be_time - the total roundtrip time of the remote service call
  // dom_time - the time spent processing the result of the service call (or user defined)
  // fe_time - the time spent rendering the result of the service call (or user defined)
  function inlineHit(t, request_name, queue_time, app_time, total_be_time, dom_time, fe_time) {
    if (!isBrowserWindow) return
    
    request_name = window.encodeURIComponent(request_name)
    cycle += 1


    const agentInfo = getInfo(agentIdentifier);
    if (!agentInfo.beacon) return

    var url = scheme + '://' + agentInfo.beacon + '/1/' + agentInfo.licenseKey

    url += '?a=' + agentInfo.applicationID + '&'
    url += 't=' + request_name + '&'
    url += 'qt=' + ~~queue_time + '&'
    url += 'ap=' + ~~app_time + '&'
    url += 'be=' + ~~total_be_time + '&'
    url += 'dc=' + ~~dom_time + '&'
    url += 'fe=' + ~~fe_time + '&'
    url += 'c=' + cycle

    submitData.img(url)
  }

  function setErrorHandler(t, handler) {
    getRuntime(agentIdentifier).onerror = handler
  }

  var releaseCount = 0
  function addRelease(t, name, id) {
    if (++releaseCount > 10) return
    getRuntime(agentIdentifier).releaseIds[name.slice(-200)] = ('' + id).slice(-200)
  }

  // experimental feature -- not ready
  // nr.BrowserAgentInstance = async function (){
  //   const { BrowserAgent } = await import('@newrelic/browser-agent')
  //   return new BrowserAgent()
  // }
}