/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope } from '../constants/runtime'
import { now } from '../timing/now'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 */

/**
 * Tracks first contentful paint for a specific MFE by observing DOM mutations.
 * Creates a dedicated MutationObserver that auto-disconnects after detecting FCP.
 * @param {string} id - The MFE ID to track
 * @returns {Promise<number>} Promise that resolves with the FCP timestamp
 */
export function trackMFEFirstPaint (id) {
  return new Promise((resolve) => {
    if (!id || !globalScope.MutationObserver || !globalScope.document) return

    const obs = new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (!node.textContent?.trim() && !['img', 'video', 'canvas', 'svg'].includes(node.nodeName?.toLowerCase())) return
        try {
          let curr = node.nodeType === 1 ? node : node.parentElement
          while (curr?.tagName) {
            if (curr.dataset?.nrMfeId === id) {
              const fcp = now()
              obs.disconnect()
              resolve(fcp)
              return
            }
            curr = curr.parentNode
          }
        } catch (e) {}
      }))
    })

    obs.observe(globalScope.document, { childList: true, subtree: true })
  })
}
