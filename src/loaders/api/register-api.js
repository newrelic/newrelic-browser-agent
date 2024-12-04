import { handle } from '../../common/event-emitter/handle'
import { warn } from '../../common/util/console'
import { isValidTarget } from '../../common/util/target'
import { FEATURE_NAMES } from '../features/features'
import { now } from '../../common/timing/now'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'

/**
* @typedef {Object} RegisterAPI
* @property {Function} addPageAction - Add a page action for the registered entity.
* @property {Function} log - Capture a log for the registered entity.
* @property {Function} noticeError - Notice an error for the registered entity.
* @property {Function} setApplicationVersion - Add an application.version attribute to all outgoing data for the registered entity.
* @property {Function} setCustomAttribute - Add a custom attribute to outgoing data for the registered entity.
* @property {Function} setUserId - Add an enduser.id attribute to all outgoing API data for the registered entity.
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
  if (!isValidTarget(target)) return warn(46, target)

  const waitForRumResponse = new Promise((resolve, reject) => {
    /** if the connect callback doesnt resolve in 15 seconds... reject */
    const timeout = setTimeout(reject, 15000)
    handle('api-pve', [(data) => {
      try {
        clearTimeout(timeout)
        target.entityGuid = data.app.agents?.[0].entityGuid
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }], undefined, FEATURE_NAMES.pageViewEvent, agentRef.ee)
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
      return warn(48, err)
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
