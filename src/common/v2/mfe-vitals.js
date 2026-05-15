/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../constants/runtime'
import { now } from '../timing/now'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 */

const isObservable = (node) => node.textContent?.trim() || ['img', 'video', 'canvas', 'svg'].includes(node.nodeName?.toLowerCase())
const supportsMFEVitals = (id) => !!id && isBrowserScope && globalScope.MutationObserver && globalScope.PerformanceObserver

/**
 * Observes DOM mutations for a specific MFE and invokes callback when content is added
 */
function observeMFE (id, onMatch) {
  const obs = new globalScope.MutationObserver(mutations => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
      if (!isObservable(node)) return
      try {
        let curr = node.nodeType === 1 ? node : node.parentElement
        while (curr?.tagName) {
          if (curr.dataset?.nrMfeId === id) return onMatch(node, obs)
          curr = curr.parentNode
        }
      } catch (e) {}
    }))
  })
  obs.observe(globalScope.document, { childList: true, subtree: true })
  return obs
}

/**
 * Tracks first contentful paint for a specific MFE by observing DOM mutations.
 * Creates a dedicated MutationObserver that auto-disconnects after detecting FCP.
 * @param {string} id - The MFE ID to track
 * @returns {{value: number|null}} Object with value property that gets set to FCP timestamp
 */
export function trackMFEFirstPaint (id) {
  const tracker = { value: null }
  if (!supportsMFEVitals(id)) return tracker

  observeMFE(id, (node, obs) => {
    tracker.value = now()
    obs.disconnect()
  })

  return tracker
}

/**
 * Tracks largest contentful paint for a specific MFE by observing DOM mutations.
 * Calculates element sizes and tracks when the largest element is added.
 * @param {string} id - The MFE ID to track
 * @returns {{value: number|null, disconnect: Function}} Object with value property that updates with LCP timestamp
 */
export function trackMFELargestPaint (id) {
  const tracker = { value: null, disconnect: () => {} }
  if (!supportsMFEVitals(id)) return tracker

  let largestSize = 0
  const obs = observeMFE(id, (node) => {
    const elem = node.nodeType === 1 ? node : node.parentElement
    const rect = elem.getBoundingClientRect()
    const size = rect.width * rect.height
    if (size > largestSize) {
      largestSize = size
      tracker.value = now()
    }
  })

  tracker.disconnect = () => obs.disconnect()
  ;['click', 'keydown', 'scroll', 'visibilitychange', 'pagehide'].forEach(type => {
    globalScope.addEventListener(type, tracker.disconnect, { once: true, passive: true })
  })

  return tracker
}

/**
 * Tracks cumulative layout shift for a specific MFE by observing layout shift entries.
 * Only counts shifts from elements within the MFE that don't have recent user input.
 * @param {string} id - The MFE ID to track
 * @returns {{value: number, disconnect: Function}} Object with value property that accumulates CLS score
 */
export function trackMFELayoutShift (id) {
  const tracker = { value: 0, disconnect: () => {} }
  if (!supportsMFEVitals(id)) return tracker

  const obs = new globalScope.PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.hadRecentInput) return
      (entry.sources || []).some(source => {
        try {
          let curr = source.node
          while (curr?.tagName) {
            if (curr.dataset?.nrMfeId === id) {
              tracker.value += entry.value
              return true
            }
            curr = curr.parentNode
          }
        } catch (e) {}
        return false
      })
    })
  })

  tracker.disconnect = () => obs.disconnect()
  globalScope.addEventListener('visibilitychange', tracker.disconnect, { once: true })
  globalScope.addEventListener('pagehide', tracker.disconnect, { once: true })

  try {
    obs.observe({ type: 'layout-shift', buffered: true })
  } catch (e) {}

  return tracker
}
