/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../features/features'
import { handle } from '../../common/event-emitter/handle'
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
import { buildRegisterApi } from './register-api'
import { dispatchGlobalEvent } from '../../common/dispatch/global-event'
import { activatedFeatures } from '../../common/util/feature-flags'

export function setTopLevelCallers () {
  const nr = gosCDN()
  apiMethods.forEach(f => {
    nr[f] = (...args) => caller(f, ...args)
  })

  function caller (fnName, ...args) {
    let returnVals = []
    Object.values(nr.initializedAgents).forEach(agt => {
      if (!agt || !agt.runtime) {
        warn(38, fnName)
      } else if (agt.exposed && agt[fnName] && agt.runtime.loaderType !== 'micro-agent') {
        returnVals.push(agt[fnName](...args))
      }
    })
    return returnVals[0]
  }
}

const replayRunning = {}

export function setAPI (agent, forceDrain) {
  if (!forceDrain) registerDrain(agent.agentIdentifier, 'api')
  const tracerEE = agent.ee.get('tracer')

  replayRunning[agent.agentIdentifier] = MODE.OFF

  agent.ee.on(SR_EVENT_EMITTER_TYPES.REPLAY_RUNNING, (isRunning) => {
    replayRunning[agent.agentIdentifier] = isRunning
  })

  const prefix = 'api-'
  const spaPrefix = prefix + 'ixn-'

  /** Shared handlers are used by both the base agent instance as well as "registered" entities
   * We isolate them like this so that the public interface methods are unchanged and still dont require
   * a target, but the register APIs `can` supply a target.
  */
  const sharedHandlers = {
    addPageAction: function (name, attributes, targetEntityGuid, timestamp = now()) {
      apiCall(prefix, 'addPageAction', true, FEATURE_NAMES.genericEvents, timestamp)(name, attributes, targetEntityGuid)
    },
    log: function (message, { customAttributes = {}, level = LOG_LEVELS.INFO } = {}, targetEntityGuid, timestamp = now()) {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/log/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
      bufferLog(agent.ee, message, customAttributes, level, targetEntityGuid, timestamp)
    },
    noticeError: function (err, customAttributes, targetEntityGuid, timestamp = now()) {
      if (typeof err === 'string') err = new Error(err)
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/noticeError/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
      handle('err', [err, timestamp, false, customAttributes, !!replayRunning[agent.agentIdentifier], undefined, targetEntityGuid], undefined, FEATURE_NAMES.jserrors, agent.ee)
    }
  }

  /**
   * @experimental
   * IMPORTANT: This feature is being developed for use internally and is not in a public-facing production-ready state.
   * It is not recommended for use in production environments and will not receive support for issues.
   */
  agent.register = function (target) {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/register/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
    return buildRegisterApi(agent, sharedHandlers, target)
  }

  agent.log = function (message, options) {
    sharedHandlers.log(message, options)
  }

  agent.wrapLogger = (parent, functionName, { customAttributes = {}, level = LOG_LEVELS.INFO } = {}) => {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/wrapLogger/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
    wrapLogger(agent.ee, parent, functionName, { customAttributes, level })
  }

  // Setup stub functions that queue calls for later processing.
  asyncApiMethods.forEach(fnName => { agent[fnName] = apiCall(prefix, fnName, true, 'api') })

  agent.addPageAction = function (name, attributes) {
    sharedHandlers.addPageAction(name, attributes)
  }

  agent.recordCustomEvent = apiCall(prefix, 'recordCustomEvent', true, FEATURE_NAMES.genericEvents)

  agent.setPageViewName = function (name, host) {
    if (typeof name !== 'string') return
    if (name.charAt(0) !== '/') name = '/' + name
    agent.runtime.customTransaction = (host || 'http://custom.transaction') + name
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
    const currentInfo = agent.info
    if (value === null) {
      delete currentInfo.jsAttributes[key]
    } else {
      agent.info = { ...agent.info, jsAttributes: { ...currentInfo.jsAttributes, [key]: value } }
    }
    return apiCall(prefix, apiName, true, (!!addToBrowserStorage || value === null) ? 'session' : undefined)(key, value)
  }
  agent.setCustomAttribute = function (name, value, persistAttribute = false) {
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
  agent.setUserId = function (value) {
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
  agent.setApplicationVersion = function (value) {
    if (!(typeof value === 'string' || value === null)) {
      warn(42, typeof value)
      return
    }
    return appendJsAttribute('application.version', value, 'setApplicationVersion', false)
  }

  agent.start = () => {
    try {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/start/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
      agent.ee.emit('manual-start-all')
    } catch (err) {
      warn(23, err)
    }
  }

  agent[SR_EVENT_EMITTER_TYPES.RECORD] = function () {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/recordReplay/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
    handle(SR_EVENT_EMITTER_TYPES.RECORD, [], undefined, FEATURE_NAMES.sessionReplay, agent.ee)
  }

  agent[SR_EVENT_EMITTER_TYPES.PAUSE] = function () {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/pauseReplay/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
    handle(SR_EVENT_EMITTER_TYPES.PAUSE, [], undefined, FEATURE_NAMES.sessionReplay, agent.ee)
  }

  agent.interaction = function (options) {
    return new InteractionHandle().get(typeof options === 'object' ? options : {})
  }

  function InteractionHandle () { }

  const InteractionApiProto = InteractionHandle.prototype = {
    createTracer: function (name, cb) {
      var contextStore = {}
      var ixn = this
      var hasCb = typeof cb === 'function'
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/createTracer/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
      // Soft navigations won't support Tracer nodes, but this fn should still work the same otherwise (e.g., run the orig cb).
      if (!agent.runSoftNavOverSpa) handle(spaPrefix + 'tracer', [now(), name, contextStore], ixn, FEATURE_NAMES.spa, agent.ee)
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
    InteractionApiProto[name] = function () {
      return apiCall
        .apply(this, [spaPrefix, name, undefined, agent.runSoftNavOverSpa ? FEATURE_NAMES.softNav : FEATURE_NAMES.spa])
        .apply(this, arguments)
    }
  })
  agent.setCurrentRouteName = function () {
    return agent.runSoftNavOverSpa
      ? apiCall(spaPrefix, 'routeName', undefined, FEATURE_NAMES.softNav)(...arguments)
      : apiCall(prefix, 'routeName', true, FEATURE_NAMES.spa)(...arguments)
  }

  function apiCall (prefix, name, notSpa, bufferGroup, timestamp = now()) {
    return function () {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/' + name + '/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
      dispatchGlobalEvent({
        agentIdentifier: agent.agentIdentifier,
        drained: !!activatedFeatures?.[agent.agentIdentifier],
        type: 'data',
        name: 'api',
        feature: prefix + name,
        data: { notSpa, bufferGroup }
      })
      if (bufferGroup) handle(prefix + name, [timestamp, ...arguments], notSpa ? null : this, bufferGroup, agent.ee) // no bufferGroup means only the SM is emitted
      return notSpa ? undefined : this // returns the InteractionHandle which allows these methods to be chained
    }
  }

  agent.noticeError = function (err, customAttributes) {
    sharedHandlers.noticeError(err, customAttributes)
  }

  // theres no window.load event on non-browser scopes, lazy load immediately
  if (!isBrowserScope) lazyLoad()
  // try to stay out of the way of the window.load event, lazy load once that has finished.
  else onWindowLoad(() => lazyLoad(), true)

  function lazyLoad () {
    import(/* webpackChunkName: "async-api" */'./apiAsync').then(({ setAsyncAPI }) => {
      setAsyncAPI(agent)
      drain(agent.agentIdentifier, 'api')
    }).catch((err) => {
      warn(27, err)
      agent.ee.abort()
    })
  }

  return true
}
