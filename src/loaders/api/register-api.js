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

/**
 * @typedef {import('./register-api-types').RegisterAPI} RegisterAPI
 */

/**
 * Builds the api object that will be returned from the register api method.
 * Also conducts certain side-effects, such as harvesting a PageView event when triggered and gathering metadata for the registered entity.
 * @param {Object} agentRef the reference to the base agent instance
 * @param {Object} handlers the shared handlers to be used by both the base agent's API and the external target's API
 * @param {Object} target the target information to be used by the external target's API to send data to the correct location
 * @returns {RegisterAPI} the api object to be returned from the register api method
 */
export function buildRegisterApi (agentRef, handlers, target) {
  const attrs = {}
  warn(53, 'newrelic.register')

  let invalidTargetResponse
  if (!agentRef.init.api.allow_registered_children) invalidTargetResponse = () => warn(54)
  if (!isValidTarget(target, false)) invalidTargetResponse = () => warn(47, target)
  if (invalidTargetResponse) {
    invalidTargetResponse()
    return {
      addPageAction: invalidTargetResponse,
      log: invalidTargetResponse,
      noticeError: invalidTargetResponse,
      setApplicationVersion: invalidTargetResponse,
      setCustomAttribute: invalidTargetResponse,
      setUserId: invalidTargetResponse,
      /** metadata */
      metadata: {
        customAttributes: attrs,
        target
      }
    }
  }

  /**
   * Wait for all needed connections for the registered child to be ready to report data
   * 1. The main agent to be ready (made a RUM call and got its entity guid)
   * 2. The child to be registered with the main agent (made its own RUM call and got its entity guid)
   * @type {Promise<void>}
   */
  const connected = new Promise((resolve, reject) => {
    let mainAgentReady = !!agentRef.runtime.entityManager.get().entityGuid
    let registrationReady = false

    /** if the connect callback doesnt resolve in 15 seconds... reject */
    const timeout = setTimeout(reject, 15000)

    // tell the main agent to send a rum call for this target
    // when the rum call resolves, it will emit an "entity-added" event, see below
    agentRef.ee.emit('api-send-rum', [attrs, target])

    // wait for entity events to emit to see when main agent and/or API registration is ready
    agentRef.ee.on('entity-added', entity => {
      if (isContainerAgentTarget(entity, agentRef)) mainAgentReady ||= true
      if (target.licenseKey === entity.licenseKey && target.applicationID === entity.applicationID) {
        registrationReady = true
        target.entityGuid = entity.entityGuid
      }

      if (mainAgentReady && registrationReady) {
        clearTimeout(timeout)
        resolve()
      }
    })
  })

  /**
     * The reporter method that will be used to report the data to the container agent's API method.
     * If the api.duplicate_registered_data configuration value is set to true, the data will be reported to BOTH the container and the external target
     * @param {*} methodToCall the container agent's API method to call
     * @param {*} args the arguments to supply to the container agent's API method
     * @param {string} targetEntityGuid the target entity guid, which looks up the target to report the data to from the entity manager. If undefined, will report to the container agent's target.
     * @returns
     */
  const report = async (methodToCall, args, target) => {
    /** set the timestamp before the async part of waiting for the rum response for better accuracy */
    const timestamp = now()
    handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/register/${methodToCall.name}/called`], undefined, FEATURE_NAMES.metrics, agentRef.ee)
    try {
      await connected
      // target should be decorated with entityGuid by the rum resp at this point
      if (agentRef.init.api.duplicate_registered_data) { methodToCall(...args, undefined, timestamp) } // also report to container by providing undefined target
      methodToCall(...args, target.entityGuid, timestamp) // report to target
    } catch (err) {
      warn(49, err)
    }
  }
  return {
    addPageAction: (name, attributes = {}) => report(handlers.addPageAction, [name, { ...attrs, ...attributes }], target),
    log: (message, options = {}) => report(handlers.log, [message, { ...options, customAttributes: { ...attrs, ...(options.customAttributes || {}) } }], target),
    noticeError: (error, attributes = {}) => report(handlers.noticeError, [error, { ...attrs, ...attributes }], target),
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
      connected
    }
  }
}
