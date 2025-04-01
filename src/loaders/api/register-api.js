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
  const assets = new Set()

  const stack = new Error().stack
  const fileNamesOfThisModule = extractJavaScriptFilenames(stack)
  console.log('REGISTER CALLED BY', fileNamesOfThisModule)

  let match
  performance.getEntriesByType('resource').forEach(entry => {
    fileNamesOfThisModule.forEach(moduleName => {
      console.log('entry.name', entry.name, moduleName)
      if (entry.name.includes(moduleName) && !assets.has(entry)) {
        match = entry
        assets.add(entry)
      }
    })
  })

  console.log('resource?', match)

  const attrs = {}
  warn(53, 'newrelic.register')

  /** @type {Function|undefined} a function that is set and reports when APIs are triggered -- warns the customer of the invalid state  */
  let invalidApiResponse

  /**
   * Wait for all needed connections for the registered child to be ready to report data
   * 1. The main agent to be ready (made a RUM call and got its entity guid)
   * 2. The child to be registered with the main agent (made its own RUM call and got its entity guid)
   * @type {Promise<RegisterAPI>}
   */
  let connected
  if (!agentRef.init.api.allow_registered_children) invalidApiResponse = () => warn(54)
  if (!target || !isValidTarget(target)) invalidApiResponse = () => warn(47, target)

  if (invalidApiResponse) {
    invalidApiResponse()
    connected = Promise.reject(new Error('Failed to connect'))
  } else {
    connected = new Promise((resolve, reject) => {
      try {
        let mainAgentReady = !!agentRef.runtime.entityManager?.get().entityGuid
        let registrationReady = false

        /** if the connect callback doesnt resolve in 15 seconds... reject */
        const timeout = setTimeout(() => reject(new Error('Failed to connect - Timeout')), 15000)

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
            resolve(api)
          }
        })
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

    const stack = new Error().stack
    console.log(stack)
    const fileNamesOfThisModule = extractJavaScriptFilenames(stack)
    console.log('REPORT CALLED BY', fileNamesOfThisModule)

    let match
    performance.getEntriesByType('resource').forEach(entry => {
      fileNamesOfThisModule.forEach(moduleName => {
        console.log('entry.name', entry.name, moduleName)
        if (entry.name.includes(moduleName) && !assets.has(entry)) {
          match = entry
          assets.add(entry)
        }
      })
    })

    console.log('resource?', match)
    console.log('all assets', assets)
    try {
      await connected
      // target should be decorated with entityGuid by the rum resp at this point
      const shouldDuplicate = agentRef.init.api.duplicate_registered_data
      if (shouldDuplicate === true || (Array.isArray(shouldDuplicate) && shouldDuplicate.includes(target.entityGuid))) {
        // also report to container by providing undefined target
        methodToCall(...args, undefined, timestamp)
      }
      methodToCall(...args, target.entityGuid, timestamp) // always report to target
    } catch (err) {
      warn(49, err)
    }
  }

  const api = {
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

  return api
}

function extractJavaScriptFilenames (stack) {
  // Regex to match JavaScript filenames in the stack trace
  const regex = /(\/[\w-./]+\.js)/g
  const matches = new Set()
  let match

  // Iterate through all matches in the stack
  while ((match = regex.exec(stack)) !== null) {
    matches.add(match[1])
  }

  return Array.from(matches)
}
