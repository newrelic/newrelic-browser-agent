/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from '../../common/util/console'
import { getRegisteredEntityByIframeInterfaceId } from '../../common/v2/utils'
import { IFRAME_TIMING_UPDATE, IFRAME_API, IFRAME_API_RESPONSE, IFRAME_VITALS_UPDATE, IFRAME_AJAX } from '../../common/constants/iframe-constants'
import { REGISTER } from '../api/constants'
import { handle } from '../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../features/features'
import { stringify } from '../../common/util/stringify'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { drain } from '../../common/drain/drain'
import { isBrowserScope } from '../../common/constants/runtime'

/**
 * Retrieves the registered entity associated with the iframeInterfaceId from the event data, and validates that the origin of the message event matches the expected origin for that entity.
 * @param {MessageEvent} event - The message event containing the method call or registration request
 * @param {Object} agent - The browser agent instance
 * @returns {Object|undefined} - The registered entity if it exists and the origin is valid, otherwise undefined
 */
function getValidEntity (event, agent) {
  try {
    const { iframeInterfaceId } = event.data
    if (!iframeInterfaceId) return
    const entity = getRegisteredEntityByIframeInterfaceId(iframeInterfaceId, agent)
    if (!isValidOrigin(event, entity)) return
    return entity
  } catch (e) {
    // couldnt get entity or validate origin, just let the method return undefined
  }
}

function isSafeProperty (obj, property) {
  return property in obj && typeof property === 'string' && !['__proto__', 'constructor', 'prototype'].includes(property)
}

/**
 * Handles timing property updates from iframes. Mutates the timings object on the entity's metadata with the new value for the specified property.
 * @param {MessageEvent} event - The message event containing the timing update
 * @param {Object} agent - The browser agent instance
 * @returns
 */
function handleTimingUpdate (event, agent) {
  const entity = getValidEntity(event, agent)
  if (!entity) return

  if (entity.metadata?.timings) {
    const { property, value } = event.data
    if (isSafeProperty(entity.metadata.timings, property)) entity.metadata.timings[property] = value
  }
}

/**
 * Handles vitals property updates from iframes. Mutates the vitals object on the entity's metadata with the new value for the specified property.
 * @param {MessageEvent} event - The message event containing the vitals update
 * @param {Object} agent - The browser agent instance
 * @returns
 */
function handleVitalsUpdate (event, agent) {
  const entity = getValidEntity(event, agent)
  if (!entity) return

  if (entity.metadata?.vitals) {
    const { property, value } = event.data
    if (isSafeProperty(entity.metadata.vitals, property) && (!!Number(value) || value === 0)) {
      entity.metadata.vitals[property].value = value
    }
  }
}

/**
 * Handles ajax events from iframes and forwards them to the agent's event emitter
 * @param {MessageEvent} event  - The message event containing the method call or registration request
 * @param {Object} agent - The browser agent instance
 * @returns
 */
function handleAjax (event, agent) {
  const entity = getValidEntity(event, agent)
  if (!entity) return
  const { params, metrics, start, end, initiatorType } = event.data
  handle('xhr', [params, metrics, start, end, initiatorType, entity.metadata.target], undefined, FEATURE_NAMES.ajax, agent.ee)
}

/**
 * Validates that the origin of the message event matches the expected origin for the registered entity
 * @param {MessageEvent} event - The message event containing the method call or registration request
 * @param {Object} entity - The registered entity associated with the iframeInterfaceId from the event data
 * @returns {boolean}
 */
function isValidOrigin (event, entity) {
  if (!entity || !event.origin) return false
  try {
    return event.origin === entity.metadata.target.iframeOrigin
  } catch (e) {
    warn(77, e)
    return false
  }
}

/**
 * Handles both entity registration and method calls on existing entities
 * @async
 * @param {MessageEvent} event - The message event containing the method call or registration request
 * @param {Object} agent - The browser agent instance
 * @returns {Promise<{entity: Object|null, result: any}>}
 */
async function handleMethodCall (event, agent) {
  const { method, args, target, iframeInterfaceId } = event.data
  const output = { entity: null, result: null }
  // Registration of a new entity needs to be handled differently than method calls on existing entities
  if (method === REGISTER) {
    const iframeDomains = agent.init.api.register.iframe_domains
    if (iframeDomains.length && !iframeDomains.includes(event.origin)) {
      warn(74, event.origin)
      return output
    }
    const targetData = args?.[0] || target || {}
    if (!agent[REGISTER]) {
      warn(35, REGISTER)
      return output
    }

    const freshTarget = {
      id: targetData.id,
      name: targetData.name,
      type: targetData.type,
      version: targetData.version,
      tags: targetData.tags
    }

    output.entity = agent[REGISTER](freshTarget)
    output.entity.metadata.target.iframeInterfaceId = iframeInterfaceId
    output.entity.metadata.target.iframeOrigin = event.origin

    return output
  }

  const entity = getRegisteredEntityByIframeInterfaceId(iframeInterfaceId, agent)
  if (!isValidOrigin(event, entity)) {
    warn(76)
    return output
  }

  output.entity = entity
  const methodFn = entity[method]
  if (typeof methodFn !== 'function') {
    warn(35, method)
    return output
  }

  output.result = await methodFn.apply(entity, args || [])
  return output
}

/**
 * Serializes entity metadata for postMessage response.
 * Strips out any non-serializable properties and returns a plain object.
 * postMessage cant handle complex objects that cause DataCloneErrors to throw like functions, circular references, etc.
 * @param {Object} entity - The registered entity whose metadata is to be serialized.  Uses a pattern of stringify and parse to remove any non-serializable properties from the metadata object.
 * @returns {Object} - The serialized metadata object
*/
function serializeMetadata (entity) {
  const meta = entity.metadata

  return JSON.parse(stringify(meta))
}

/**
 * Sends a postMessage response to the iframe
 * @param {MessageEvent} event - The message event containing the method call or registration request
 * @param {Object} payload - The response payload to send back to the iframe
 */
function sendResponse (event, payload) {
  event.source.postMessage({
    type: IFRAME_API_RESPONSE,
    messageId: event.data.messageId,
    iframeInterfaceId: event.data.iframeInterfaceId,
    ...payload
  }, event.origin)
}

/**
 * Sets up a postMessage listener to handle API calls and timing updates from iframes
 * @param {Object} agent The agent instance
 */
export function setupIframeMFEMessageListener (agent) {
  if (!isBrowserScope || !window.addEventListener || agent.runtime.listeningForIframeMessages) return

  registerHandler('iframe-message', async (event) => {
    if (!event.data) return

    switch (event.data.type) {
      case IFRAME_TIMING_UPDATE:
        handleTimingUpdate(event, agent)
        return
      case IFRAME_VITALS_UPDATE:
        handleVitalsUpdate(event, agent)
        return
      case IFRAME_AJAX:
        handleAjax(event, agent)
        return
      case IFRAME_API:
        try {
          if (!event.source || !event.data.messageId || !event.data.method) return
          const { entity, result } = await handleMethodCall(event, agent)
          const metadata = entity ? serializeMetadata(entity) : undefined
          sendResponse(event, { result, metadata })
        } catch (error) {
          const errorMessage = error?.message || String(error)
          sendResponse(event, { error: errorMessage })
        }
    }
  }, 'IFRAME', agent.ee)

  drain(agent, 'IFRAME', true) // drain any buffered iframe messages that were received before the listener was set up
  agent.runtime.listeningForIframeMessages = true
}
