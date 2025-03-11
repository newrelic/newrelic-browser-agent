/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../features/features'
import { getInfo, setInfo } from '../../common/config/info'
import { getRuntime } from '../../common/config/runtime'
import { handle } from '../../common/event-emitter/handle'
import { ee } from '../../common/event-emitter/contextual-ee'
import { drain, registerDrain } from '../../common/drain/drain'
import { onWindowLoad } from '../../common/window/load'
import { isBrowserScope } from '../../common/constants/runtime'
import { warn } from '../../common/util/console'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { gosCDN } from '../../common/window/nreum'
import { apiMethods, asyncApiMethods } from './api-methods'
import { SR_EVENT_EMITTER_TYPES } from '../../features/session_replay/constants'
import { now } from '../../common/timing/now'
import { MODE } from '../../common/session/constants'
import { LOG_LEVELS } from '../../features/logging/constants'
import { bufferLog } from '../../features/logging/shared/utils'
import { wrapLogger } from '../../common/wrap/wrap-logger'
import { dispatchGlobalEvent } from '../../common/dispatch/global-event'

export function setTopLevelCallers () {
  const nr = gosCDN()
  apiMethods.forEach(f => {
    nr[f] = (...args) => caller(f, ...args)
  })

  function caller (fnName, ...args) {
    let returnVals = []
    Object.values(nr.initializedAgents).forEach(val => {
      if (!val || !val.api) {
        warn(38, fnName)
      } else if (val.exposed && val.api[fnName]) {
        returnVals.push(val.api[fnName](...args))
      }
    })
    return returnVals.length > 1 ? returnVals : returnVals[0]
  }
}

const replayRunning = {}

export function setAPI (agentIdentifier, forceDrain, runSoftNavOverSpa = false) {
  if (!forceDrain) registerDrain(agentIdentifier, 'api')
  const apiInterface = {}
  var instanceEE = ee.get(agentIdentifier)
  var tracerEE = instanceEE.get('tracer')

  replayRunning[agentIdentifier] = MODE.OFF

  instanceEE.on(SR_EVENT_EMITTER_TYPES.REPLAY_RUNNING, (isRunning) => {
    replayRunning[agentIdentifier] = isRunning
  })

  var prefix = 'api-'
  var spaPrefix = prefix + 'ixn-'

  apiInterface.log = function (message, { customAttributes = {}, level = LOG_LEVELS.INFO } = {}) {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/log/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
    bufferLog(instanceEE, message, customAttributes, level)
  }

  apiInterface.wrapLogger = (parent, functionName, { customAttributes = {}, level = LOG_LEVELS.INFO } = {}) => {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/wrapLogger/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
    wrapLogger(instanceEE, parent, functionName, { customAttributes, level })
  }

  // Setup stub functions that queue calls for later processing.
  asyncApiMethods.forEach(fnName => { apiInterface[fnName] = apiCall(prefix, fnName, true, 'api') })

  apiInterface.addPageAction = apiCall(prefix, 'addPageAction', true, FEATURE_NAMES.genericEvents)

  apiInterface.recordCustomEvent = apiCall(prefix, 'recordCustomEvent', true, FEATURE_NAMES.genericEvents)

  apiInterface.setPageViewName = function (name, host) {
    if (typeof name !== 'string') return
    if (name.charAt(0) !== '/') name = '/' + name
    getRuntime(agentIdentifier).customTransaction = (host || 'http://custom.transaction') + name
    return apiCall(prefix, 'setPageViewName', true)()
  }

  /**
   * Attach the key-value attribute onto agent payloads. All browser events in NR will be affected.
   * @param {string} key
   * @param {string|number|boolean|null} value - null indicates the key should be removed or erased
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
      warn(39, typeof name)
      return
    }
    if (!(['string', 'number', 'boolean'].includes(typeof value) || value === null)) {
      warn(40, typeof value)
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
      warn(41, typeof value)
      return
    }
    return appendJsAttribute('enduser.id', value, 'setUserId', true)
  }

  /**
   * Attach the 'applcation.version' attribute onto agent payloads. This may be used in NR queries to group all browser events by a specific customer-defined release.
   * @param {string|null} value - Application version -- if null, will "unset" the value
   * @returns @see apiCall
   */
  apiInterface.setApplicationVersion = function (value) {
    if (!(typeof value === 'string' || value === null)) {
      warn(42, typeof value)
      return
    }
    return appendJsAttribute('application.version', value, 'setApplicationVersion', false)
  }

  apiInterface.start = () => {
    try {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/start/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
      instanceEE.emit('manual-start-all')
    } catch (err) {
      warn(23, err)
    }
  }

  apiInterface[SR_EVENT_EMITTER_TYPES.RECORD] = function () {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/recordReplay/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
    handle(SR_EVENT_EMITTER_TYPES.RECORD, [], undefined, FEATURE_NAMES.sessionReplay, instanceEE)
  }

  apiInterface[SR_EVENT_EMITTER_TYPES.PAUSE] = function () {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/pauseReplay/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
    handle(SR_EVENT_EMITTER_TYPES.PAUSE, [], undefined, FEATURE_NAMES.sessionReplay, instanceEE)
  }

  apiInterface.interaction = function (options) {
    return new InteractionHandle().get(typeof options === 'object' ? options : {})
  }

  function InteractionHandle () { }

  const InteractionApiProto = InteractionHandle.prototype = {
    createTracer: function (name, cb) {
      var contextStore = {}
      var ixn = this
      var hasCb = typeof cb === 'function'
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/createTracer/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
      // Soft navigations won't support Tracer nodes, but this fn should still work the same otherwise (e.g., run the orig cb).
      if (!runSoftNavOverSpa) handle(spaPrefix + 'tracer', [now(), name, contextStore], ixn, FEATURE_NAMES.spa, instanceEE)
      return function () {
        tracerEE.emit((hasCb ? '' : 'no-') + 'fn-start', [now(), ixn, hasCb], contextStore)
        if (hasCb) {
          try {
            return cb.apply(this, arguments)
          } catch (err) {
            const error = typeof err === 'string' ? new Error(err) : err
            tracerEE.emit('fn-err', [arguments, this, error], contextStore)
            // the error came from outside the agent, so don't swallow
            throw error
          } finally {
            tracerEE.emit('fn-end', [now()], contextStore)
          }
        }
      }
    }
  }

  ;['actionText', 'setName', 'setAttribute', 'save', 'ignore', 'onEnd', 'getContext', 'end', 'get'].forEach(name => {
    InteractionApiProto[name] = apiCall(spaPrefix, name, undefined, runSoftNavOverSpa ? FEATURE_NAMES.softNav : FEATURE_NAMES.spa)
  })
  apiInterface.setCurrentRouteName = runSoftNavOverSpa ? apiCall(spaPrefix, 'routeName', undefined, FEATURE_NAMES.softNav) : apiCall(prefix, 'routeName', true, FEATURE_NAMES.spa)

  function apiCall (prefix, name, notSpa, bufferGroup) {
    return function () {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/' + name + '/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
      dispatchGlobalEvent({
        agentIdentifier,
        loaded: true,
        type: 'data',
        name: 'api',
        feature: prefix + name,
        data: { notSpa, bufferGroup }
      })
      if (bufferGroup) handle(prefix + name, [notSpa ? now() : performance.now(), ...arguments], notSpa ? null : this, bufferGroup, instanceEE) // no bufferGroup means only the SM is emitted
      return notSpa ? undefined : this // returns the InteractionHandle which allows these methods to be chained
    }
  }

  apiInterface.noticeError = function (err, customAttributes) {
    if (typeof err === 'string') err = new Error(err)
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/noticeError/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
    handle('err', [err, now(), false, customAttributes, !!replayRunning[agentIdentifier]], undefined, FEATURE_NAMES.jserrors, instanceEE)
  }

  // theres no window.load event on non-browser scopes, lazy load immediately
  if (!isBrowserScope) lazyLoad()
  // try to stay out of the way of the window.load event, lazy load once that has finished.
  else onWindowLoad(() => lazyLoad(), true)

  function lazyLoad () {
    import(/* webpackChunkName: "async-api" */'./apiAsync').then(({ setAPI }) => {
      setAPI(agentIdentifier)
      drain(agentIdentifier, 'api')
    }).catch((err) => {
      warn(27, err)
      instanceEE.abort()
    })
  }

  return apiInterface
}
