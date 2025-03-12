/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { warn } from '../../common/util/console'
import { isValidTarget } from '../../common/util/target'
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
  if (!isValidTarget(target, false)) {
    const invalidTargetResponse = () => warn(47, target)
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

  const waitForRumResponse = new Promise((resolve, reject) => {
    /** if the connect callback doesnt resolve in 15 seconds... reject */
    const timeout = setTimeout(reject, 15000)
    handle('api-pve', [
      /** Handles the rum response when finished */
      (data) => {
        try {
          clearTimeout(timeout)
          const entityGuid = data.app.agents?.[0].entityGuid
          if (!entityGuid) {
            warn(49)
            throw new Error('Register API failed')
          }
          /** If pre-supplied, the entity guid should match the connection response's entity guid */
          if (target.entityGuid && target.entityGuid !== entityGuid) {
            warn(55, target.entityGuid)
            throw new Error('Register API failed')
          }
          target.entityGuid ??= entityGuid
          resolve(data)
        } catch (err) {
          reject(err)
        }
      },
      /** custom attributes to send with the rum call */
      attrs,
      /** target to send the rum call to (we dont have the entityguid yet in PVE call, so must supply a direct obj) */
      target
    ], undefined, FEATURE_NAMES.pageViewEvent, agentRef.ee)
  })

  /**
     * The reporter method that will be used to report the data to the container agent's API method.
     * If the external.capture_registered_data configuration value is set to true, the data will be reported to BOTH the container and the external target
     * @param {*} methodToCall the container agent's API method to call
     * @param {*} args the arguments to supply to the container agent's API method
     * @param {string} targetEntityGuid the target entity guid, which looks up the target to report the data to from the entity manager. If undefined, will report to the container agent's target.
     * @returns
     */
  const report = (methodToCall, args, target) => {
    /** set the timestamp before the async part of waiting for the rum response for better accuracy */
    const timestamp = now()
    handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/register/${methodToCall.name}/called`], undefined, FEATURE_NAMES.metrics, agentRef.ee)
    waitForRumResponse.then((rumResponse) => {
      // target should be decorated with entityGuid by the rum resp at this point
      if (methodToCall === handlers.log && !(target.entityGuid && rumResponse.log)) return // not enough metadata <or> was not sampled
      if (agentRef.init.external.capture_registered_data) { methodToCall(...args, undefined, timestamp) } // also report to container by providing undefined target
      methodToCall(...args, target.entityGuid, timestamp) // report to target
    }).catch(err => {
      warn(49, err)
    })
  }
  const apis = {
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
      target
    },
    on: (eventName, callback) => {
      if (eventName === 'ready') waitForRumResponse.then(() => callback(apis))
      if (eventName === 'error') waitForRumResponse.catch((err) => callback(err))

      return apis
    }
  }
  return apis
}
