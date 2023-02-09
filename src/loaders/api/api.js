/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import slice from 'lodash._slice'
import { FEATURE_NAMES } from '../features/features'
import { getRuntime, setInfo, getInfo } from '../../common/config/config'
import { handle } from '../../common/event-emitter/handle'
import { mapOwn } from '../../common/util/map-own'
import { ee } from '../../common/event-emitter/contextual-ee'
import { now } from '../../common/timing/now'
import { drain, registerDrain } from '../../common/drain/drain'
import { onWindowLoad } from '../../common/window/load'
import { isWorkerScope } from '../../common/util/global-scope'
import { warn } from '../../common/util/console'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'

function setTopLevelCallers (nr) {
  const funcs = [
    'setErrorHandler', 'finished', 'addToTrace', 'inlineHit', 'addRelease',
    'addPageAction', 'setCurrentRouteName', 'setPageViewName', 'setCustomAttribute',
    'interaction', 'noticeError'
  ]
  funcs.forEach(f => {
    nr[f] = (...args) => caller(f, ...args)
  })

  function caller (fnName, ...args) {
    Object.values(nr.initializedAgents).forEach(val => {
      if (val.exposed && val.api[fnName]) val.api[fnName](...args)
    })
  }
}

export function setAPI (agentIdentifier, nr, forceDrain) {
  if (!forceDrain) registerDrain(agentIdentifier, 'api')
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

  nr.addPageAction = apiCall(prefix, 'addPageAction', true, FEATURE_NAMES.pageAction)
  nr.setCurrentRouteName = apiCall(prefix, 'routeName', true, FEATURE_NAMES.spa)

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

  function InteractionHandle () { }

  var InteractionApiProto = InteractionHandle.prototype = {
    createTracer: function (name, cb) {
      var contextStore = {}
      var ixn = this
      var hasCb = typeof cb === 'function'
      handle(spaPrefix + 'tracer', [now(), name, contextStore], ixn, FEATURE_NAMES.spa, instanceEE)
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

  mapOwn('actionText,setName,setAttribute,save,ignore,onEnd,getContext,end,get'.split(','), function addApi (n, name) {
    InteractionApiProto[name] = apiCall(spaPrefix, name, undefined, FEATURE_NAMES.spa)
  })

  function apiCall (prefix, name, notSpa, bufferGroup) {
    return function () {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/' + name + '/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
      handle(prefix + name, [now()].concat(slice(arguments)), notSpa ? null : this, bufferGroup, instanceEE)
      return notSpa ? void 0 : this
    }
  }

  nr.noticeError = function (err, customAttributes) {
    if (typeof err === 'string') err = new Error(err)
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/noticeError/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
    handle('err', [err, now(), false, customAttributes], undefined, FEATURE_NAMES.jserrors, instanceEE)
  }

  // theres no window.load event on non-browser scopes, lazy load immediately
  if (isWorkerScope) lazyLoad()
  // try to stay out of the way of the window.load event, lazy load once that has finished.
  else onWindowLoad(() => lazyLoad(), true)

  function lazyLoad () {
    import(/* webpackChunkName: "async-api" */'./apiAsync').then(({ setAPI }) => {
      setAPI(agentIdentifier)
      drain(agentIdentifier, 'api')
    }).catch(() => warn('Downloading runtime APIs failed...'))
  }
}
