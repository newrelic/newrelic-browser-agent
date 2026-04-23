/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getRegisteredEntityByIframeInterfaceId } from '../../common/v2/utils'

const API_RESPONSE = 'newrelic-iframe-api-response'

/**
 * Handles timing property updates from iframes
 */
function handleTimingUpdate (event, agent) {
  const { iframeInterfaceId, property, value } = event.data
  if (!iframeInterfaceId || !property) return

  const entity = getRegisteredEntityByIframeInterfaceId(iframeInterfaceId, agent)
  if (!entity) return
  if (entity.metadata.target.iframeOrigin && event.origin !== entity.metadata.target.iframeOrigin) return

  if (entity.metadata?.timings) {
    entity.metadata.timings[property] = value
  }
}

/**
 * Creates and registers a new entity
 */
function handleRegister (targetData, iframeInterfaceId, agent) {
  if (!agent.register) {
    throw new Error('Register API is not available on the agent. Ensure required features are initialized.')
  }

  const freshTarget = {
    id: targetData.id,
    name: targetData.name,
    type: targetData.type,
    version: targetData.version,
    tags: targetData.tags
  }

  const entity = agent.register(freshTarget)
  entity.metadata.target.iframeInterfaceId = iframeInterfaceId
  return entity
}

/**
 * Executes a method on an existing registered entity
 */
async function handleMethodCall (method, args, iframeInterfaceId, agent) {
  const entity = getRegisteredEntityByIframeInterfaceId(iframeInterfaceId, agent)
  if (!entity) {
    throw new Error(`No registered entity found for iframeInterfaceId: ${iframeInterfaceId}`)
  }

  const methodFn = entity[method]
  if (typeof methodFn !== 'function') {
    throw new Error(`Method ${method} is not available on registered entity`)
  }

  return { entity, result: await methodFn.apply(entity, args || []) }
}

/**
 * Serializes entity metadata for postMessage response
 */
function serializeMetadata (entity) {
  const meta = entity.metadata
  const targetObj = meta.target

  let parentData
  try {
    parentData = targetObj.parent
      ? { id: targetObj.parent.id, type: targetObj.parent.type }
      : undefined
  } catch (e) {
    try {
      parentData = targetObj.parent ? { type: targetObj.parent.type } : undefined
    } catch (e2) {
      parentData = undefined
    }
  }

  return {
    customAttributes: { ...meta.customAttributes },
    target: {
      id: targetObj.id,
      name: targetObj.name,
      type: targetObj.type,
      version: targetObj.version,
      instance: targetObj.instance,
      licenseKey: targetObj.licenseKey,
      isolated: targetObj.isolated,
      tags: { ...targetObj.tags },
      parent: parentData
    },
    timings: { ...meta.timings }
  }
}

/**
 * Sends a postMessage response to the iframe
 */
function sendResponse (source, origin, messageId, iframeInterfaceId, payload) {
  source.postMessage({
    type: API_RESPONSE,
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
    // Handle timing updates
    if (event.data?.type === 'newrelic-iframe-timing-update') {
      handleTimingUpdate(event, agent)
      return
    }

    // Validate API call structure
    if (event.data?.type !== 'newrelic-iframe-api') return
    const { messageId, target, method, args, iframeInterfaceId } = event.data
    const source = event.source
    if (!source || !messageId || !method) return

    // Validate origin for non-register methods
    if (method !== 'register') {
      const entity = getRegisteredEntityByIframeInterfaceId(iframeInterfaceId, agent)
      if (!entity || (entity.metadata.target.iframeOrigin && event.origin !== entity.metadata.target.iframeOrigin)) {
        return
      }
    }

    try {
      const targetData = args?.[0] || target || {}
      const { entity, result } = method === 'register'
        ? { entity: handleRegister(targetData, iframeInterfaceId, agent), result: null }
        : await handleMethodCall(method, args, iframeInterfaceId, agent)

      const metadata = entity ? serializeMetadata(entity) : undefined
      sendResponse(source, event.origin, messageId, iframeInterfaceId, { result, metadata })
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error occurred'
      sendResponse(source, event.origin, messageId, iframeInterfaceId, { error: errorMessage })
    }
  })
}
