/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { warn } from '../../common/util/console'
import { V2_TYPES } from '../../common/util/v2'
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

/**
 * @typedef {import('./register-api-types').RegisterAPI} RegisterAPI
 */

const PROTECTED_KEYS = ['name', 'id', 'type']

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
 * @param {import('./register-api-types').RegisterAPIConstructor} [parent]
 * @returns {RegisterAPI} the api object to be returned from the register api method
 */
function register (agentRef, target, parent) {
  warn(54, 'newrelic.register')

  target ||= {}
  target.type = V2_TYPES.MFE
  target.licenseKey ||= agentRef.info.licenseKey // will inherit the license key from the container agent if not provided for brevity. A future state may dictate that we need different license keys to do different things.
  target.blocked = false
  target.parent = parent || {}
  if (typeof target.tags !== 'object' || target.tags === null || Array.isArray(target.tags)) target.tags = {}

  const attrs = {}

  // Process tags object and add to attrs, excluding protected keys
  Object.entries(target.tags).forEach(([key, value]) => {
    if (!PROTECTED_KEYS.includes(key)) {
      attrs[`source.${key}`] = value
    }
  })

  target.isolated ??= true

  /** @type {Function} a function that is set and reports when APIs are triggered -- warns the customer of the invalid state  */
  let invalidApiResponse = () => {}
  /** @type {Array} the array of registered target APIs */
  const registeredEntities = agentRef.runtime.registeredEntities

  if (!target.isolated) {
  /** if we have already registered this non-isolated target, go ahead and re-use it */
    const sharedEntity = registeredEntities.find(({ metadata: { target: { id } } }) => id === target.id && !target.isolated)
    if (sharedEntity) return sharedEntity
  }

  /**
   * Block the API, and supply a warning function to display a message to end users
   * @param {Function} warning
   */
  const block = (warning) => {
    target.blocked = true
    invalidApiResponse = warning
  }

  function hasValidValue (val) {
    return (typeof val === 'string' && !!val.trim() && val.trim().length < 501) || (typeof val === 'number')
  }

  /** primary cases that can block the register API from working at init time */
  if (!agentRef.init.api.allow_registered_children) block(single(() => warn(55)))
  if (!hasValidValue(target.id) || !hasValidValue(target.name)) block(single(() => warn(48, target)))

  /** @type {RegisterAPI} */
  const api = {
    addPageAction: (name, attributes = {}) => report(addPageAction, [name, { ...attrs, ...attributes }, agentRef], target),
    deregister: () => {
      /** note: blocking this instance will disable access for all entities sharing the instance, and will invalidate it from the v2 checks */
      block(single(() => warn(68)))
    },
    log: (message, options = {}) => report(log, [message, { ...options, customAttributes: { ...attrs, ...(options.customAttributes || {}) } }, agentRef], target),
    measure: (name, options = {}) => report(measure, [name, { ...options, customAttributes: { ...attrs, ...(options.customAttributes || {}) } }, agentRef], target),
    noticeError: (error, attributes = {}) => report(noticeError, [error, { ...attrs, ...attributes }, agentRef], target),
    register: (target = {}) => report(register, [agentRef, target], api.metadata.target),
    recordCustomEvent: (eventType, attributes = {}) => report(recordCustomEvent, [eventType, { ...attrs, ...attributes }, agentRef], target),
    setApplicationVersion: (value) => setLocalValue('application.version', value),
    setCustomAttribute: (key, value) => setLocalValue(key, value),
    setUserId: (value) => setLocalValue('enduser.id', value),
    /** metadata */
    metadata: {
      customAttributes: attrs,
      target
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
  if (!isBlocked()) registeredEntities.push(api)

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
     * If the api.duplicate_registered_data configuration value is set to true, the data will be reported to BOTH the container and the external target
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
    handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/register/${methodToCall.name}/called`], undefined, FEATURE_NAMES.metrics, agentRef.ee)
    try {
      const shouldDuplicate = agentRef.init.api.duplicate_registered_data && methodToCall !== register
      if (shouldDuplicate) {
        let duplicatedArgs = args
        if (args[1] instanceof Object) {
          const childAttrs = { 'child.id': target.id, 'child.type': target.type }
          if ('customAttributes' in args[1]) duplicatedArgs = [args[0], { ...args[1], customAttributes: { ...args[1].customAttributes, ...childAttrs } }, ...args.slice(2)]
          else duplicatedArgs = [args[0], { ...args[1], ...childAttrs }, ...args.slice(2)]
        }
        methodToCall(...duplicatedArgs, undefined, timestamp)
      }
      return methodToCall(...args, target, timestamp) // always report to target
    } catch (err) {
      warn(50, err)
    }
  }

  return api
}
