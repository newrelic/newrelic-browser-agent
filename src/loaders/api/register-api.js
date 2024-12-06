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
  if (!isValidTarget(target)) {
    const invalidTargetResponse = () => warn(46, target)
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
          target.entityGuid = data.app.agents?.[0].entityGuid
          resolve(data)
        } catch (err) {
          reject(err)
        }
      },
      /** custom attributes to send with the rum call */
      attrs,
      /** target to send the rum call to */
      target
    ], undefined, FEATURE_NAMES.pageViewEvent, agentRef.ee)
  })

  /**
     * The reporter method that will be used to report the data to the container agent's API method.
     * If the external.capture_registered_data configuration value is set to true, the data will be reported to BOTH the container and the external target
     * @param {*} methodToCall the container agent's API method to call
     * @param {*} args the arguments to supply to the container agent's API method
     * @param {*} target the target to report the data to. If undefined, will report to the container agent's target.
     * @returns
     */
  const report = (methodToCall, args, target) => {
    /** set the timestamp before the async part of waiting for the rum response for better accuracy */
    const timestamp = now()
    handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/register/${methodToCall.name}/called`], undefined, FEATURE_NAMES.metrics, agentRef.ee)
    waitForRumResponse.then((rumResponse) => {
      if (methodToCall === handlers.log && !(target.entityGuid && rumResponse.log)) return // not enough metadata <or> was not sampled
      if (agentRef.init.external.capture_registered_data) { methodToCall(...args, undefined, timestamp) } // also report to container by providing undefined target
      methodToCall(...args, target, timestamp) // report to target
    }).catch(err => {
      warn(48, err)
    })
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
      target
    }
  }
}
