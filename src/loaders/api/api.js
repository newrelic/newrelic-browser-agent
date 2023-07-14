/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../features/features'
import { getRuntime, setInfo, getInfo } from '../../common/config/config'
import { handle } from '../../common/event-emitter/handle'
import { ee } from '../../common/event-emitter/contextual-ee'
import { now } from '../../common/timing/now'
import { drain, registerDrain } from '../../common/drain/drain'
import { onWindowLoad } from '../../common/window/load'
import { isBrowserScope } from '../../common/constants/runtime'
import { warn } from '../../common/util/console'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { gosCDN } from '../../common/window/nreum'

export const CUSTOM_ATTR_GROUP = 'CUSTOM/' // the subgroup items should be stored under in storage API

export function setTopLevelCallers () {
  const nr = gosCDN()
  const funcs = [
    'setErrorHandler', 'finished', 'addToTrace', 'inlineHit', 'addRelease',
    'addPageAction', 'setCurrentRouteName', 'setPageViewName', 'setCustomAttribute',
    'interaction', 'noticeError', 'setUserId'
  ]
  funcs.forEach(f => {
    nr[f] = (...args) => caller(f, ...args)
  })

  function caller (fnName, ...args) {
    let returnVals = []
    Object.values(nr.initializedAgents).forEach(val => {
      if (val.exposed && val.api[fnName]) {
        returnVals.push(val.api[fnName](...args))
      }
    })
    return returnVals.length > 1 ? returnVals : returnVals[0]
  }
}

export function setAPI (agentIdentifier, forceDrain) {
  if (!forceDrain) registerDrain(agentIdentifier, 'api')
  const apiInterface = {}
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
  asyncApiFns.forEach(fnName => apiInterface[fnName] = apiCall(prefix, fnName, true, 'api'))

  apiInterface.addPageAction = apiCall(prefix, 'addPageAction', true, FEATURE_NAMES.pageAction)
  apiInterface.setCurrentRouteName = apiCall(prefix, 'routeName', true, FEATURE_NAMES.spa)

  apiInterface.setPageViewName = function (name, host) {
    if (typeof name !== 'string') return
    if (name.charAt(0) !== '/') name = '/' + name
    getRuntime(agentIdentifier).customTransaction = (host || 'http://custom.transaction') + name
    return apiCall(prefix, 'setPageViewName', true)()
  }

  /**
   * Attach the key-value attribute onto agent payloads. All browser events in NR will be affected.
   * @param {string} key
   * @param {string|number|null} value - null indicates the key should be removed or erased
   * @param {string} apiName
   * @param {boolean} addToBrowserStorage - whether this attribute should be stored in browser storage API and retrieved by the next agent context or initialization
   * @returns @see apiCall
   */
  function appendJsAttribute (key, value, apiName, addToBrowserStorage) {
    const currentInfo = getInfo(agentIdentifier)
    if (value === null) {
      delete currentInfo.jsAttributes[key]
    } else {
      setInfo(agentIdentifier, { ...currentInfo, jsAttributes: { ...currentInfo.jsAttributes, [key]: value } })
    }
    return apiCall(prefix, apiName, true, (!!addToBrowserStorage || value === null) ? 'session' : undefined)(key, value)
  }
  apiInterface.setCustomAttribute = function (name, value, persistAttribute = false) {
    if (typeof name !== 'string') {
      warn(`Failed to execute setCustomAttribute.\nName must be a string type, but a type of <${typeof name}> was provided.`)
      return
    }
    if (!(['string', 'number'].includes(typeof value) || value === null)) {
      warn(`Failed to execute setCustomAttribute.\nNon-null value must be a string or number type, but a type of <${typeof value}> was provided.`)
      return
    }
    return appendJsAttribute(name, value, 'setCustomAttribute', persistAttribute)
  }
  /**
   * Attach the 'enduser.id' attribute onto agent payloads. This may be used in NR queries to group all browser events by specific users.
   * @param {string} value - unique user identifier; a null user id suggests none should exist
   * @returns @see apiCall
   */
  apiInterface.setUserId = function (value) {
    if (!(typeof value === 'string' || value === null)) {
      warn(`Failed to execute setUserId.\nNon-null value must be a string type, but a type of <${typeof value}> was provided.`)
      return
    }
    return appendJsAttribute('enduser.id', value, 'setUserId', true)
  }

  apiInterface.interaction = function () {
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

  void ['actionText', 'setName', 'setAttribute', 'save', 'ignore', 'onEnd', 'getContext', 'end', 'get'].forEach(name => {
    InteractionApiProto[name] = apiCall(spaPrefix, name, undefined, FEATURE_NAMES.spa)
  })

  function apiCall (prefix, name, notSpa, bufferGroup) {
    return function () {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/' + name + '/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
      if (bufferGroup) handle(prefix + name, [now(), ...arguments], notSpa ? null : this, bufferGroup, instanceEE) // no bufferGroup means only the SM is emitted
      return notSpa ? void 0 : this
    }
  }

  apiInterface.noticeError = function (err, customAttributes) {
    if (typeof err === 'string') err = new Error(err)
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/noticeError/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
    handle('err', [err, now(), false, customAttributes], undefined, FEATURE_NAMES.jserrors, instanceEE)
  }

  // theres no window.load event on non-browser scopes, lazy load immediately
  if (!isBrowserScope) lazyLoad()
  // try to stay out of the way of the window.load event, lazy load once that has finished.
  else onWindowLoad(() => lazyLoad(), true)

  function lazyLoad () {
    import(/* webpackChunkName: "async-api" */'./apiAsync').then(({ setAPI }) => {
      setAPI(agentIdentifier)
      drain(agentIdentifier, 'api')
    }).catch(() => warn('Downloading runtime APIs failed...'))
  }

  return apiInterface
}
