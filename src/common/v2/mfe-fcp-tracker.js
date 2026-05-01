/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope } from '../constants/runtime'
import { now } from '../timing/now'
import { analyzeElemPath } from '../dom/selector-path'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 */

/** @type {Map<string, number>} - Tracks MFE IDs that have already had their FCP detected */
const mfeFCPDetected = new Map()

/** @type {Map<string, Set<RegisterAPITimings>>} - Maps MFE IDs to their timing subscribers */
const mfeTimingsSubscribers = new Map()

/** @type {MutationObserver|null} - The singleton observer instance */
let mfeFCPObserver = null

/** @type {Object|null} - The shared agent reference for all MFEs */
let agentRef = null

/**
 * Subscribes a timings object to receive FCP updates for a specific MFE ID
 * @param {string} mfeId - The MFE ID to track
 * @param {RegisterAPITimings} timings - The timings object to update when FCP is detected
 * @param {Object} agentReference - The agent reference for analyzeElemPath
 */
export function subscribeMFEFCP (mfeId, timings, agentReference) {
  if (!mfeId || !agentReference) return

  // Set up the observer on first subscription
  if (!mfeFCPObserver) {
    agentRef = agentReference
    setupMFEFCPObserver()
  }

  const id = String(mfeId)

  // If FCP already detected, set it immediately
  if (mfeFCPDetected.has(id)) {
    timings.mfeFCP = mfeFCPDetected.get(id)
    return
  }

  // Otherwise, subscribe for future detection
  if (!mfeTimingsSubscribers.has(id)) {
    mfeTimingsSubscribers.set(id, new Set())
  }
  mfeTimingsSubscribers.get(id).add(timings)
}

/**
 * Checks if a node contains renderable content (text, images, or other visual elements)
 * @param {Node} node - The DOM node to check
 * @returns {boolean} True if the node contains renderable content
 */
function hasRenderableContent (node) {
  // Text nodes with non-whitespace content
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.trim().length > 0
  }

  // Element nodes
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.nodeName.toLowerCase()

    // Visual elements that are always considered renderable
    if (['img', 'video', 'canvas', 'svg', 'picture', 'iframe'].includes(tagName)) {
      return true
    }

    // Check for text content in the element
    if (node.textContent?.trim().length > 0) {
      return true
    }

    // Check for background images via computed style
    try {
      const computedStyle = globalScope.getComputedStyle?.(node)
      if (computedStyle?.backgroundImage && computedStyle.backgroundImage !== 'none') {
        return true
      }
    } catch (e) {
      // Ignore style computation errors
    }
  }

  return false
}

/**
 * Sets up the MutationObserver to detect MFE first contentful paint
 * Tracks when DOM nodes with renderable content are added within MFE containers
 */
function setupMFEFCPObserver () {
  if (!globalScope.MutationObserver || !globalScope.document || mfeFCPObserver) return

  mfeFCPObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        // Skip if not an element or doesn't have renderable content
        if (!hasRenderableContent(node)) return

        try {
          // Use analyzeElemPath to find MFE targets
          const elem = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
          if (!elem) return

          const { targets } = analyzeElemPath(elem, [], agentRef)

          console.log('targets found', targets)

          // Process each target that hasn't had FCP detected yet
          targets.forEach(target => {
            if (!target?.id) return

            const mfeId = String(target.id)
            if (mfeFCPDetected.has(mfeId)) return

            // Record the FCP time for this MFE
            const fcpTime = now()
            console.log('MFE FCP detected', fcpTime)
            mfeFCPDetected.set(mfeId, fcpTime)

            // Notify all subscribers for this MFE ID
            const subscribers = mfeTimingsSubscribers.get(mfeId)
            if (subscribers) {
              subscribers.forEach(timings => {
                timings.mfeFCP = fcpTime
              })
              // Clean up subscribers after notifying
              mfeTimingsSubscribers.delete(mfeId)
            }
          })
        } catch (error) {
          // Don't let DOM analysis errors break anything
        }
      })
    })
  })

  mfeFCPObserver.observe(globalScope.document, {
    childList: true,
    subtree: true
  })
}
