/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { warn } from '../../common/util/console'
import { V2_TYPES } from '../../common/v2/utils'
import { FEATURE_NAMES } from '../features/features'
import { now } from '../../common/timing/now'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { setupAPI } from './sharedHandlers'
import { REGISTER } from './constants'
import { log } from './log'
import { addPageAction } from './addPageAction'
import { noticeError } from './noticeError'
import { single } from '../../common/util/invoke'
import { measure } from './measure'
import { recordCustomEvent } from './recordCustomEvent'
import { subscribeToPageUnload } from '../../common/window/page-visibility'
import { findScriptTimings } from '../../common/v2/script-tracker'
import { subscribeMFEFCP } from '../../common/v2/mfe-fcp-tracker'
import { generateRandomHexString } from '../../common/ids/unique-id'

/**
 * @typedef {import('./register-api-types').RegisterAPI} RegisterAPI
 */

const PROTECTED_KEYS = ['name', 'id', 'type']

/**
 * Map of API methods to their names (prevents minification from breaking method name references)
 * @private
 */
const METHOD_NAMES = new Map([
  [addPageAction, 'addPageAction'],
  [log, 'log'],
  [measure, 'measure'],
  [noticeError, 'noticeError'],
  [recordCustomEvent, 'recordCustomEvent']
])

/**
 * Warning functions that only fire once - can be reset in tests
 * @private
 */
export const warnings = {
  experimental: single(() => warn(54, 'newrelic.register')),
  disabled: single(() => warn(55)),
  invalidTarget: single((target) => warn(48, target)),
  deregistered: single(() => warn(68))
}

/**
 * @experimental
 * IMPORTANT: This feature is being developed for use internally and is not in a public-facing production-ready state.
 * It is not recommended for use in production environments and will not receive support for issues.
 */
export function setupRegisterAPI (agent) {
  setupAPI(REGISTER, function (target) {
    return register(agent, target)
  }, agent)
}

/**
 * Builds the api object that will be returned from the register api method.
 * Also conducts certain side-effects, such as harvesting a PageView event when triggered and gathering metadata for the registered entity.
 * @param {Object} agentRef the reference to the base agent instance
 * @param {import('./register-api-types').RegisterAPIConstructor} target
 * @returns {RegisterAPI} the api object to be returned from the register api method
 */
function register (agentRef, target) {
  warnings.experimental()

  target ||= {}
  target.instance = generateRandomHexString(8)
  target.type = V2_TYPES.MFE
  target.licenseKey ||= agentRef.info.licenseKey // will inherit the license key from the container agent if not provided for brevity. A future state may dictate that we need different license keys to do different things.
  target.blocked = false
  if (typeof target.tags !== 'object' || target.tags === null || Array.isArray(target.tags)) target.tags = {}
  target.parent ??= {
    get id () { return agentRef.runtime.appMetadata.agents[0].entityGuid }, // getter because this is asyncronously set
    type: V2_TYPES.BA
  }

  const timings = findScriptTimings()

  console.log('timings', timings)

  // Subscribe to MFE FCP detection for this entity
  subscribeMFEFCP(target.id, timings, agentRef)

  const attrs = {}

  // Only define attributes getter if it doesn't already exist
  if (!Object.prototype.hasOwnProperty.call(target, 'attributes')) {
    Object.defineProperty(target, 'attributes', {
      get () {
        return {
          ...attrs,
          'source.id': target.id,
          'source.name': target.name,
          'source.type': target.type,
          'parent.type': target.parent?.type || V2_TYPES.BA,
          'parent.id': target.parent?.id
        }
      }
    })
  }

  // Process tags object and add to attrs, excluding protected keys
  Object.entries(target.tags).forEach(([key, value]) => {
    if (!PROTECTED_KEYS.includes(key)) {
      attrs[`source.${key}`] = value
    }
  })

  /** @type {Function} a function that is set and reports when APIs are triggered -- warns the customer of the invalid state  */
  let invalidApiResponse = () => {}
  /** @type {Array} the array of registered target APIs */
  const registeredEntities = agentRef.runtime.registeredEntities

  /**
   * Block the API, and supply a warning function to display a message to end users
   * @param {Function} warning
   */
  const block = (warning) => {
    target.blocked = true
    invalidApiResponse = warning
  }

  function hasValidValue (val) {
    return (typeof val === 'string' && !!val.trim() && val.trim().length < 501)
  }

  /** primary cases that can block the register API from working at init time */
  if (!agentRef.init.api.register.enabled) block(warnings.disabled)
  if (!hasValidValue(target.id) || !hasValidValue(target.name)) block(() => warnings.invalidTarget(target))

  /** @type {RegisterAPI} */
  const api = {
    addPageAction: (name, attributes = {}) => report(addPageAction, [name, { ...attrs, ...attributes }, agentRef], target),
    deregister: () => {
      /** note: blocking this instance will disable access for all entities sharing the instance, and will invalidate it from the v2 checks */
      reportTimings()
      block(warnings.deregistered)
    },
    log: (message, options = {}) => report(log, [message, { ...options, customAttributes: { ...attrs, ...(options.customAttributes || {}) } }, agentRef], target),
    measure: (name, options = {}) => report(measure, [name, { ...options, customAttributes: { ...attrs, ...(options.customAttributes || {}) } }, agentRef], target),
    noticeError: (error, attributes = {}) => report(noticeError, [error, { ...attrs, ...attributes }, agentRef], target),
    recordCustomEvent: (eventType, attributes = {}) => report(recordCustomEvent, [eventType, { ...attrs, ...attributes }, agentRef], target),
    setApplicationVersion: (value) => setLocalValue('application.version', value),
    setCustomAttribute: (key, value) => setLocalValue(key, value),
    setUserId: (value) => setLocalValue('enduser.id', value),
    /** metadata */
    metadata: {
      get customAttributes () { return attrs },
      target,
      timings
    }
  }

  /**
   * Check if the API is blocked and emit a warning message describing the blockage
   * @returns {boolean}
   */
  const isBlocked = () => {
    if (target.blocked) invalidApiResponse()
    return target.blocked
  }

  /** only allow registered APIs to be tracked in the agent runtime */
  if (!isBlocked()) {
    registeredEntities.push(api)
    console.log('subscribe to page unload with report timings', { registeredEntities })
    subscribeToPageUnload(reportTimings)
  }

  /**
   * Reports the gathered timings for the registered entity through a custom event to the container agent. Only reports once
   * by checking for the presence of the reportedAt timing.
   * @returns {void}
   */
  function reportTimings () {
    console.log('REPORT timings...', timings)
    // only ever report the timings the first time this is called
    if (timings.reportedAt) return
    timings.reportedAt = now()
    const timeToFetch = timings.fetchEnd - timings.fetchStart // fetchStart to fetchEnd
    const timeToExecute = timings.scriptEnd - timings.scriptStart // scriptStart to scriptEnd
    api.recordCustomEvent('MicroFrontEndTiming', {
      assetUrl: timings.asset, // the url of the script that was registered, or undefined if it could not be determined (inline or no match)
      assetType: timings.type, // the type of asset that was associated with the timings, one of 'script', 'link' (if preloaded and found in the resource timing buffer), 'preload' (if preloaded but not found in the resource timing buffer), or "unknown" if it could not be determined
      timeAlive: timings.reportedAt - timings.registeredAt, // registeredAt to reportedAt
      timeToBeRequested: timings.fetchStart, // origin to fetchStart
      timeToExecute, // scriptStart to scriptEnd
      timeToFetch, // fetchStart to fetchEnd
      timeToLoad: timeToFetch + timeToExecute, // fetch time and script time together
      timeToRegister: timings.registeredAt, // timestamp when register() was called
      timeToFirstPaint: timings.mfeFCP - timings.scriptStart
    })
  }

  /**
   * Sets a value local to the registered API attrs. Will do nothing if APIs are deregistered.
   * @param {string} key The attribute key
   * @param {*} value the attribute value
   * @returns {void}
   */
  const setLocalValue = (key, value) => {
    if (isBlocked()) return
    attrs[key] = value
  }

  /**
     * The reporter method that will be used to report the data to the container agent's API method. If invalid, will log a warning and not execute.
     * If the api.register.duplicate_data_to_container configuration value is set to true, the data will be reported to BOTH the container and the external target
     * @param {*} methodToCall the container agent's API method to call
     * @param {*} args the arguments to supply to the container agent's API method
     * @param {string} target the target to report the data to. If undefined, will report to the container agent's target.
     * @returns
     */
  const report = (methodToCall, args, target) => {
    /** Even if we are blocked, if registering we should still return a child register API so nested API calls do not throw errors */
    if (isBlocked() && methodToCall !== register) return
    /** set the timestamp before the async part of waiting for the rum response for better accuracy */
    const timestamp = now()
    const methodName = METHOD_NAMES.get(methodToCall) || 'unknown'
    handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/register/${methodName}/called`], undefined, FEATURE_NAMES.metrics, agentRef.ee)
    try {
      return methodToCall(...args, target, timestamp) // always report to target
    } catch (err) {
      warn(50, err)
    }
  }

  return api
}
