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

/**
 * Retrieves the registered entity associated with the iframeInterfaceId from the event data, and validates that the origin of the message event matches the expected origin for that entity.
 * @param {MessageEvent} event
 * @param {Object} agent
 * @returns {Object|undefined}
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

/**
 * Handles timing property updates from iframes
 */
function handleTimingUpdate (event, agent) {
  const entity = getValidEntity(event, agent)
  if (!entity) return

  if (entity.metadata?.timings) {
    const { property, value } = event.data
    entity.metadata.timings[property] = value
  }
}

/**
 * Handles vitals property updates from iframes
 */
function handleVitalsUpdate (event, agent) {
  const entity = getValidEntity(event, agent)
  if (!entity) return

  if (entity.metadata?.vitals) {
    const { property, value } = event.data
    if (value !== null && value !== undefined) entity.metadata.vitals[property] = value
  }
}

function handleAjax (event, agent) {
  const entity = getValidEntity(event, agent)
  if (!entity) return
  const { params, metrics, start, end, initiatorType } = event.data
  handle('xhr', [params, metrics, start, end, initiatorType, entity.metadata.target], undefined, FEATURE_NAMES.ajax, agent.ee)
}

/**
 * Validates that the origin of the message event matches the expected origin for the registered entity
 * @param {MessageEvent} event
 * @param {Object} entity
 * @returns {boolean}
 */
function isValidOrigin (event, entity) {
  if (!entity || !event) return false
  try {
    return event.origin === entity.metadata.target.iframeOrigin
  } catch (e) {
    warn(77, e)
    return false
  }
}

/**
 * Handles both entity registration and method calls on existing entities
 */
async function handleMethodCall (method, args, target, iframeInterfaceId, agent, origin) {
  // Registration of a new entity needs to be handled differently than method calls on existing entities
  if (method === REGISTER) {
    const targetData = args?.[0] || target || {}
    if (!agent[REGISTER]) {
      warn(35, REGISTER)
      return
    }

    const freshTarget = {
      id: targetData.id,
      name: targetData.name,
      type: targetData.type,
      version: targetData.version,
      tags: targetData.tags
    }

    const entity = agent[REGISTER](freshTarget)
    entity.metadata.target.iframeInterfaceId = iframeInterfaceId
    entity.metadata.target.iframeOrigin = origin
    return { entity, result: null }
  }

  // Handle method calls on existing entities
  const entity = getRegisteredEntityByIframeInterfaceId(iframeInterfaceId, agent)
  if (!entity) return warn(76)

  const methodFn = entity[method]
  if (typeof methodFn !== 'function') return warn(35, method)

  return { entity, result: await methodFn.apply(entity, args || []) }
}

/**
 * Serializes entity metadata for postMessage response.
 * Strips out any non-serializable properties and returns a plain object.
 * postMessage cant handle complex objects that cause DataCloneErrors to throw like functions, circular references, etc.
 */
function serializeMetadata (entity) {
  const meta = entity.metadata

  return JSON.parse(stringify(meta))
}

/**
 * Sends a postMessage response to the iframe
 */
function sendResponse (source, origin, messageId, iframeInterfaceId, payload) {
  source.postMessage({
    type: IFRAME_API_RESPONSE,
    messageId,
    iframeInterfaceId,
    ...payload
  }, origin)
}

/**
 * Sets up a postMessage listener to handle API calls and timing updates from iframes
 * @param {Object} agent The agent instance
 */
export function setupIframeMFEMessageListener (agent) {
  if (typeof window === 'undefined' || !window.addEventListener) return

  window.addEventListener('message', async (event) => {
    if (!event.data) return

    // Handle timing updates
    if (event.data.type === IFRAME_TIMING_UPDATE) {
      handleTimingUpdate(event, agent)
      return
    }

    if (event.data.type === IFRAME_VITALS_UPDATE) {
      handleVitalsUpdate(event, agent)
      return
    }

    if (event.data.type === IFRAME_AJAX) {
      handleAjax(event, agent)
      return
    }

    // Validate API call structure
    if (event.data?.type !== IFRAME_API) return

    const { messageId, target, method, args, iframeInterfaceId } = event.data
    const source = event.source
    if (!source || !messageId || !method) return

    // Validate origin for non-register methods
    if (method !== REGISTER) {
      const entity = getRegisteredEntityByIframeInterfaceId(iframeInterfaceId, agent)
      if (!isValidOrigin(event, entity)) return
    }

    try {
      const { entity, result } = await handleMethodCall(method, args, target, iframeInterfaceId, agent, event.origin)
      const metadata = entity ? serializeMetadata(entity) : undefined
      sendResponse(source, event.origin, messageId, iframeInterfaceId, { result, metadata })
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error occurred'
      sendResponse(source, event.origin, messageId, iframeInterfaceId, { error: errorMessage })
    }
  })
}
