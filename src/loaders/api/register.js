/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { warn } from '../../common/util/console'
import { isContainerAgentTarget, isValidTarget } from '../../common/util/target'
import { FEATURE_NAMES } from '../features/features'
import { now } from '../../common/timing/now'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { setupAPI } from './sharedHandlers'
import { REGISTER } from './constants'
import { log } from './log'
import { addPageAction } from './addPageAction'
import { noticeError } from './noticeError'

/**
 * @typedef {import('./register-api-types').RegisterAPI} RegisterAPI
 */

/**
 * @experimental
 * IMPORTANT: This feature is being developed for use internally and is not in a public-facing production-ready state.
 * It is not recommended for use in production environments and will not receive support for issues.
 */
export function setupRegisterAPI (agent) {
  setupAPI(REGISTER, function (target) {
    return buildRegisterApi(agent, target)
  }, agent)
}

/**
 * Builds the api object that will be returned from the register api method.
 * Also conducts certain side-effects, such as harvesting a PageView event when triggered and gathering metadata for the registered entity.
 * @param {Object} agentRef the reference to the base agent instance
 * @param {Object} handlers the shared handlers to be used by both the base agent's API and the external target's API
 * @param {Object} target the target information to be used by the external target's API to send data to the correct location
 * @returns {RegisterAPI} the api object to be returned from the register api method
 */
export function buildRegisterApi (agentRef, target) {
  const attrs = {}
  warn(54, 'newrelic.register')

  /** @type {Function|undefined} a function that is set and reports when APIs are triggered -- warns the customer of the invalid state  */
  let invalidApiResponse

  /**
       * A promise that indicates when all needed connections for the registered child to be ready to report data
       * 1. The main agent to be ready (made a RUM call and got its entity guid)
       * 2. The child to be registered with the main agent (made its own RUM call and got its entity guid)
       * @type {Promise<RegisterAPI>}
       */
  let _connected
  if (!agentRef.init.api.allow_registered_children) invalidApiResponse = () => warn(55)
  if (!target || !isValidTarget(target)) invalidApiResponse = () => warn(48, target)

  /** @type {RegisterAPI} */
  const api = {
    addPageAction: (name, attributes = {}) => {
      report(addPageAction, [name, { ...attrs, ...attributes }, agentRef], target)
    },
    log: (message, options = {}) => {
      report(log, [message, { ...options, customAttributes: { ...attrs, ...(options.customAttributes || {}) } }, agentRef], target)
    },
    noticeError: (error, attributes = {}) => {
      report(noticeError, [error, { ...attrs, ...attributes }, agentRef], target)
    },
    setApplicationVersion: (value) => {
      attrs['application.version'] = value
    },
    setCustomAttribute: (key, value) => {
      attrs[key] = value
    },
    setUserId: (value) => {
      attrs['enduser.id'] = value
    },
    /** metadata */
    metadata: {
      customAttributes: attrs,
      target,
      /** set in a getter so that later access of the Promise is not polluted before customer is allowed to set a catch block */
      get connected () {
        return _connected || Promise.reject(new Error('Failed to connect'))
      }
    }
  }

  if (invalidApiResponse) {
    invalidApiResponse()
  } else {
    _connected = new Promise((resolve, reject) => {
      try {
        const entityManager = agentRef.runtime?.entityManager
        /** check if main agent already has main agent entity guid */
        let mainAgentReady = !!entityManager?.get().entityGuid
        /** check if registered target already has entity guid */
        let registeredEntityGuid = entityManager?.getEntityGuidFor(target.licenseKey, target.applicationID)
        let registrationReady = !!registeredEntityGuid

        /** check if we can just resolve immediately without making another connect call */
        if (mainAgentReady && registrationReady) {
          target.entityGuid = registeredEntityGuid
          resolve(api)
        } else {
          /** we need to make a new connection call since we dont already have a registered entity for this call */

          /** if the connect callback doesnt resolve in 15 seconds... reject */
          const timeout = setTimeout(() => reject(new Error('Failed to connect - Timeout')), 15000)

          // tell the main agent to send a rum call for this target
          // when the rum call resolves, it will emit an "entity-added" event, see below
          agentRef.ee.emit('api-send-rum', [attrs, target])

          // wait for entity events to emit to see when main agent and/or API registration is ready
          agentRef.ee.on('entity-added', entityEventHandler)

          function entityEventHandler (entity) {
            if (isContainerAgentTarget(entity, agentRef)) mainAgentReady ||= true
            else {
              if (target.licenseKey === entity.licenseKey && target.applicationID === entity.applicationID) {
                registrationReady = true
                target.entityGuid = entity.entityGuid
              }
            }

            if (mainAgentReady && registrationReady) {
              clearTimeout(timeout)
              // unsubscribe from the event emitter
              agentRef.ee.removeEventListener('entity-added', entityEventHandler)
              resolve(api)
            }
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
     * The reporter method that will be used to report the data to the container agent's API method. If invalid, will log a warning and not execute.
     * If the api.duplicate_registered_data configuration value is set to true, the data will be reported to BOTH the container and the external target
     * @param {*} methodToCall the container agent's API method to call
     * @param {*} args the arguments to supply to the container agent's API method
     * @param {string} targetEntityGuid the target entity guid, which looks up the target to report the data to from the entity manager. If undefined, will report to the container agent's target.
     * @returns
     */
  const report = async (methodToCall, args, target) => {
    if (invalidApiResponse) return invalidApiResponse()
    /** set the timestamp before the async part of waiting for the rum response for better accuracy */
    const timestamp = now()
    handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/register/${methodToCall.name}/called`], undefined, FEATURE_NAMES.metrics, agentRef.ee)
    try {
      await _connected
      // target should be decorated with entityGuid by the rum resp at this point
      const shouldDuplicate = agentRef.init.api.duplicate_registered_data
      if (shouldDuplicate === true || (Array.isArray(shouldDuplicate) && shouldDuplicate.includes(target.entityGuid))) {
        // also report to container by providing undefined target
        methodToCall(...args, undefined, timestamp)
      }
      methodToCall(...args, target.entityGuid, timestamp) // always report to target
    } catch (err) {
      warn(50, err)
    }
  }

  return api
}
