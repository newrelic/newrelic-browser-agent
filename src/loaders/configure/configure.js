/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { setTopLevelCallers } from '../api/topLevelCallers'
import { gosCDN } from '../../common/window/nreum'
import { mergeInfo } from '../../common/config/info'
import { mergeInit } from '../../common/config/init'
import { mergeRuntime } from '../../common/config/runtime'
import { isWorkerScope } from '../../common/constants/runtime'
import { redefinePublicPath } from './public-path'
import { ee } from '../../common/event-emitter/contextual-ee'
import { dispatchGlobalEvent } from '../../common/dispatch/global-event'
import { mergeLoaderConfig } from '../../common/config/loader-config'
import { getRegisteredEntityByIframeInterfaceId } from '../../common/v2/utils'

/**
 * Sets or re-sets the agent's configuration values from global settings. This also attach those as properties to the agent instance.
 * IMPORTANT: setNREUMInitializedAgent must be called on the agent prior to calling this function.
 */
export function configure (agent, opts = {}, loaderType, forceDrain) {
  // eslint-disable-next-line camelcase
  let { init, info, loader_config, runtime = {}, exposed = true } = opts
  if (!info) {
    const nr = gosCDN()
    init = nr.init
    info = nr.info
    // eslint-disable-next-line camelcase
    loader_config = nr.loader_config
  }

  agent.init = mergeInit(init || {})
  // eslint-disable-next-line camelcase
  agent.loader_config = mergeLoaderConfig(loader_config || {})

  info.jsAttributes ??= {}
  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes.isWorker = true
  }
  agent.info = mergeInfo(info)

  const updatedInit = agent.init

  agent.runtime ??= mergeRuntime(runtime)

  // Apply proxy settings whenever configure is called (supports late {init} setting)
  if (updatedInit.proxy.assets) {
    redefinePublicPath(updatedInit.proxy.assets)
  }

  if (!agent.runtime.configured) {
    Object.defineProperty(agent, 'beacons', {
      get () {
        return [agent.info.beacon, agent.info.errorBeacon, agent.init.proxy.assets, agent.init.proxy.beacon].filter(Boolean)
      }
    })

    Object.defineProperty(agent.runtime, 'denyList', {
      get () {
        // Compute the internal traffic list fresh each time to ensure beacons array is current
        return [
          ...(agent.init.ajax.deny_list || []),
          ...(agent.init.ajax.block_internal ? agent.beacons : [])
        ]
      }
    })
    agent.runtime.ptid = agent.agentIdentifier

    setTopLevelCallers(agent) // no need to set global APIs on newrelic obj more than once

    agent.runtime.loaderType = loaderType

    agent.ee = ee.get(agent.agentIdentifier)

    agent.exposed = exposed

    dispatchGlobalEvent({
      drained: !!agent.runtime.activatedFeatures,
      type: 'lifecycle',
      name: 'initialize',
      feature: undefined,
      data: agent.config
    })

    // Set up iframe postMessage listener for registered entities
    setupIframeMessageListener(agent)

    agent.runtime.configured = true
  }
}

/**
 * Sets up a postMessage listener to handle API calls from iframes
 * @param {Object} agent The agent instance
 */
function setupIframeMessageListener (agent) {
  if (typeof window === 'undefined' || !window.addEventListener) return

  window.addEventListener('message', async (event) => {
    // Handle async timing property updates from iframes
    if (event.data?.type === 'newrelic-iframe-timing-update') {
      const { iframeInterfaceId, property, value } = event.data
      if (!iframeInterfaceId || !property) return

      // Find the specific registered entity by iframe interface ID
      const entity = getRegisteredEntityByIframeInterfaceId(iframeInterfaceId, agent)
      if (entity?.metadata?.timings) {
        entity.metadata.timings[property] = value
      }
      return
    }

    // Validate message structure for API calls
    if (event.data?.type !== 'newrelic-iframe-api') return

    const { messageId, target, method, args, iframeInterfaceId } = event.data
    const source = event.source

    if (!source || !messageId || !method) return

    try {
      let result
      let registeredEntity

      // Special handling for 'register' - creates a new registered entity
      if (method === 'register') {
        // Call the agent's register API directly to create the entity
        if (!agent.register) {
          throw new Error('Register API is not available on the agent. Ensure required features are initialized.')
        }

        // Create a fresh target object from the data (don't use the cloned object directly)
        const targetData = args?.[0] || target || {}
        const freshTarget = {
          id: targetData.id,
          name: targetData.name,
          type: targetData.type,
          version: targetData.version,
          tags: targetData.tags
        }

        registeredEntity = agent.register(freshTarget)
        registeredEntity.metadata.target.iframeInterfaceId = iframeInterfaceId // track the iframe interface instance that created this entity for future reference (e.g. timing updates)
      } else {
        // For all other methods, find the existing registered entity by iframe interface ID
        registeredEntity = getRegisteredEntityByIframeInterfaceId(iframeInterfaceId, agent)

        if (!registeredEntity) {
          throw new Error(`No registered entity found for iframeInterfaceId: ${iframeInterfaceId}`)
        }

        // Execute the method on the registered entity API
        const methodFn = registeredEntity[method]
        if (typeof methodFn !== 'function') {
          throw new Error(`Method ${method} is not available on registered entity`)
        }

        // Call the method and await if it's a promise
        result = await methodFn.apply(registeredEntity, args || [])
      }

      // Serialize metadata for all responses to keep iframe entity in sync
      let metadataResponse
      if (registeredEntity) {
        const meta = registeredEntity.metadata
        const targetObj = meta.target

        // Safely extract parent info (may have getters that throw if data not ready)
        let parentData
        try {
          parentData = targetObj.parent
            ? {
                id: targetObj.parent.id,
                type: targetObj.parent.type
              }
            : undefined
        } catch (e) {
          // Parent getter may fail if appMetadata not ready
          try {
            parentData = targetObj.parent ? { type: targetObj.parent.type } : undefined
          } catch (e2) {
            // If even type fails, skip parent entirely
            parentData = undefined
          }
        }

        metadataResponse = {
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

      // Send success response back to iframe with updated metadata
      source.postMessage({
        type: 'newrelic-iframe-api-response',
        messageId,
        result: result || null,
        metadata: metadataResponse
      }, event.origin)
    } catch (error) {
      // Send error response back to iframe
      // Ensure error message is serializable
      let errorMessage
      try {
        errorMessage = error.message || String(error)
      } catch (stringifyError) {
        errorMessage = 'Unknown error occurred'
      }

      source.postMessage({
        type: 'newrelic-iframe-api-response',
        messageId,
        error: errorMessage
      }, event.origin)
    }
  })
}
