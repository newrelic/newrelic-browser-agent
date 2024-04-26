/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../features/features'
import { getRuntime, setInfo, getInfo } from '../../common/config/config'
import { handle } from '../../common/event-emitter/handle'
import { ee } from '../../common/event-emitter/contextual-ee'
import { drain, registerDrain } from '../../common/drain/drain'
import { onWindowLoad } from '../../common/window/load'
import { isBrowserScope } from '../../common/constants/runtime'
import { warn } from '../../common/util/console'
import { gosCDN } from '../../common/window/nreum'
import { ACTION_TEXT, ADD_PAGE_ACTION, END, GET, GET_CONTEXT, IGNORE, ON_END, ROUTE_NAME, SAVE, SET_APPLICATION_VERSION, SET_ATTRIBUTE, SET_CUSTOM_ATTRIBUTE, SET_NAME, SET_PAGE_VIEW_NAME, SET_USER_ID, apiMethods, apiSMs, asyncApiMethods } from './api-methods'
import { SR_EVENT_EMITTER_TYPES } from '../../features/session_replay/constants'
import { now } from '../../common/timing/now'
import { MODE } from '../../common/session/constants'
import { API_CREATE_TRACER_CALLED, API_NOTICE_ERROR_CALLED, API_PAUSE_REPLAY_CALLED, API_RECORD_REPLAY_CALLED, API_START_DEFINED_CALLED, API_START_UNDEFINED_CALLED, reportSupportabilityMetric } from '../../features/utils/supportability-metrics'

export function setTopLevelCallers () {
  const nr = gosCDN()
  apiMethods.forEach(f => {
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

  // Setup stub functions that queue calls for later processing.
  asyncApiMethods.forEach(fnName => { apiInterface[fnName] = apiCall(prefix, fnName, true, 'api') })

  apiInterface.addPageAction = apiCall(prefix, ADD_PAGE_ACTION, true, FEATURE_NAMES.pageAction)

  apiInterface.setPageViewName = function (name, host) {
    if (typeof name !== 'string') return
    if (name.charAt(0) !== '/') name = '/' + name
    getRuntime(agentIdentifier).customTransaction = (host || 'http://custom.transaction') + name
    return apiCall(prefix, SET_PAGE_VIEW_NAME, true)()
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
      warn(`Failed to execute ${SET_CUSTOM_ATTRIBUTE}.\nName must be a string type, but a type of <${typeof name}> was provided.`)
      return
    }
    if (!(['string', 'number', 'boolean'].includes(typeof value) || value === null)) {
      warn(`Failed to execute ${SET_CUSTOM_ATTRIBUTE}.\nNon-null value must be a string, number or boolean type, but a type of <${typeof value}> was provided.`)
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
    return appendJsAttribute('enduser.id', value, SET_USER_ID, true)
  }

  /**
   * Attach the 'applcation.version' attribute onto agent payloads. This may be used in NR queries to group all browser events by a specific customer-defined release.
   * @param {string|null} value - Application version -- if null, will "unset" the value
   * @returns @see apiCall
   */
  apiInterface.setApplicationVersion = function (value) {
    if (!(typeof value === 'string' || value === null)) {
      warn(`Failed to execute ${SET_APPLICATION_VERSION}. Expected <String | null>, but got <${typeof value}>.`)
      return
    }
    return appendJsAttribute('application.version', value, SET_APPLICATION_VERSION, false)
  }

  apiInterface.start = (features) => {
    try {
      const smTag = !features ? API_START_UNDEFINED_CALLED : API_START_DEFINED_CALLED
      reportSupportabilityMetric({ name: smTag }, agentIdentifier)
      const featNames = Object.values(FEATURE_NAMES)
      if (features === undefined) features = featNames
      else {
        features = Array.isArray(features) && features.length ? features : [features]
        if (features.some(f => !featNames.includes(f))) return warn(`Invalid feature name supplied. Acceptable feature names are: ${featNames}`)
        if (!features.includes(FEATURE_NAMES.pageViewEvent)) features.push(FEATURE_NAMES.pageViewEvent)
      }
      features.forEach(feature => {
        instanceEE.emit(`${feature}-opt-in`)
      })
    } catch (err) {
      warn('An unexpected issue occurred', err)
    }
  }

  apiInterface[SR_EVENT_EMITTER_TYPES.RECORD] = function () {
    reportSupportabilityMetric({ name: API_RECORD_REPLAY_CALLED }, agentIdentifier)
    handle(SR_EVENT_EMITTER_TYPES.RECORD, [], undefined, FEATURE_NAMES.sessionReplay, instanceEE)
  }

  apiInterface[SR_EVENT_EMITTER_TYPES.PAUSE] = function () {
    reportSupportabilityMetric({ name: API_PAUSE_REPLAY_CALLED }, agentIdentifier)
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
      reportSupportabilityMetric({ name: API_CREATE_TRACER_CALLED }, agentIdentifier)
      // Soft navigations won't support Tracer nodes, but this fn should still work the same otherwise (e.g., run the orig cb).
      if (!runSoftNavOverSpa) handle(spaPrefix + 'tracer', [now(), name, contextStore], ixn, FEATURE_NAMES.spa, instanceEE)
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

  ;[ACTION_TEXT, SET_NAME, SET_ATTRIBUTE, SAVE, IGNORE, ON_END, GET_CONTEXT, END, GET].forEach(name => {
    InteractionApiProto[name] = apiCall(spaPrefix, name, undefined, runSoftNavOverSpa ? FEATURE_NAMES.softNav : FEATURE_NAMES.spa)
  })
  apiInterface.setCurrentRouteName = runSoftNavOverSpa ? apiCall(spaPrefix, ROUTE_NAME, undefined, FEATURE_NAMES.softNav) : apiCall(prefix, ROUTE_NAME, true, FEATURE_NAMES.spa)

  function apiCall (prefix, name, notSpa, bufferGroup) {
    return function () {
      reportSupportabilityMetric({ name: apiSMs[name] }, agentIdentifier)
      if (bufferGroup) handle(prefix + name, [now(), ...arguments], notSpa ? null : this, bufferGroup, instanceEE) // no bufferGroup means only the SM is emitted
      return notSpa ? undefined : this // returns the InteractionHandle which allows these methods to be chained
    }
  }

  apiInterface.noticeError = function (err, customAttributes) {
    if (typeof err === 'string') err = new Error(err)
    reportSupportabilityMetric({ name: API_NOTICE_ERROR_CALLED }, agentIdentifier)
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
    }).catch(() => {
      warn('Downloading runtime APIs failed...')
      instanceEE.abort()
    })
  }

  return apiInterface
}
