/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../constants/runtime'
import { now } from '../timing/now'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 */

const isObservable = (node) => {
  try {
    return node?.textContent?.trim() || ['img', 'video', 'canvas', 'svg'].includes(node?.nodeName?.toLowerCase())
  } catch (e) {
    return false
  }
}

/**
 * Check if node is within a specific MFE
 * @param {Node} node - DOM node to check
 * @param {string} id - MFE ID to match
 * @returns {boolean}
 */
const isInMFE = (node, id) => {
  try {
    let curr = node.nodeType === 1 ? node : node.parentElement
    while (curr?.tagName) {
      if (curr.dataset?.nrMfeId === id) return true
      curr = curr.parentNode
    }
  } catch (e) {}
  return false
}

/**
 * Create mutation observer for MFE nodes
 * @param {string} id - MFE ID to track
 * @param {Function} onMatch - Callback when matching node is added
 * @returns {MutationObserver}
 */
const observeMutations = (id, onMatch) => {
  const obs = new globalScope.MutationObserver(mutations => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
      if (isObservable(node) && isInMFE(node, id)) {
        onMatch(node, obs)
      }
    }))
  })
  obs.observe(globalScope.document, { childList: true, subtree: true })
  return obs
}

/**
 * Create performance observer for MFE entries
 * @param {Array} observers - Array to track observers
 * @param {Object} config - Observer configuration
 * @param {Function} onEntry - Callback for each entry
 * @returns {PerformanceObserver|null} Observer if successful, null if unsupported
 */
const observePerformance = (observers, config, onEntry) => {
  try {
    const obs = new globalScope.PerformanceObserver(list => {
      list.getEntries().forEach(onEntry)
    })
    obs.observe(config)
    observers.push(obs)
    return obs
  } catch (e) {
    return null
  }
}

/**
 * Tracks all Core Web Vitals for a specific MFE.
 * @param {string} id - The MFE ID to track
 * @returns {{fcp: number|null, lcp: number|null, cls: number|null, inp: number|null, disconnect: Function}}
 */
export function trackMFEVitals (id) {
  const vitals = {
    fcp: null,
    lcp: null,
    cls: null,
    inp: null,
    disconnect: () => {}
  }

  if (!id || !isBrowserScope || !globalScope.MutationObserver || !globalScope.PerformanceObserver) return vitals

  const observers = []

  // Track FCP - first contentful paint
  observeMutations(id, (node, obs) => {
    vitals.fcp ??= now()
    obs.disconnect()
  })

  // Track LCP - largest contentful paint
  let largestSize = 0
  const lcpObs = observeMutations(id, (node) => {
    try {
      const elem = node.nodeType === 1 ? node : node.parentElement
      if (!elem) return
      const rect = elem.getBoundingClientRect()
      const size = rect.width * rect.height
      if (size > largestSize) {
        largestSize = size
        vitals.lcp = now()
      }
    } catch (e) {
      // Element may be detached from DOM
    }
  })
  observers.push(lcpObs)

  // Track CLS - cumulative layout shift
  const clsObs = observePerformance(observers, { type: 'layout-shift', buffered: true }, (entry) => {
    if (entry.hadRecentInput) return
    (entry.sources || []).some(source => {
      if (isInMFE(source.node, id)) {
        vitals.cls += entry.value
        return true
      }
      return false
    })
  })
  // Initialize CLS to 0 if browser supports it (Chromium), leave as null if not (Firefox/Safari)
  if (clsObs) vitals.cls = 0

  // Track INP - interaction to next paint
  observePerformance(observers, { type: 'event', buffered: true, durationThreshold: 16 }, (entry) => {
    if (!entry.interactionId || !entry.target || !isInMFE(entry.target, id)) return
    if (vitals.inp === null || entry.duration > vitals.inp) {
      vitals.inp = entry.duration
    }
  })

  // Disconnect all observers
  vitals.disconnect = () => {
    // Disconnect all observers
    observers.forEach(obs => {
      try {
        obs?.disconnect()
      } catch (e) {
        // Observer may already be disconnected
      }
    })
  }

  // Auto-disconnect LCP observer on user interaction (per Web Vitals spec)
  // CLS and INP continue tracking until visibility change or deregister
  const disconnectLCP = () => {
    try {
      lcpObs?.disconnect()
    } catch (e) {
      // Observer may already be disconnected
    }
  }
  ;['click', 'keydown', 'scroll'].forEach(type => {
    globalScope.addEventListener(type, disconnectLCP, { once: true, passive: true })
  })

  // Disconnect all observers on visibility change or page unload
  ;['visibilitychange', 'pagehide'].forEach(type => {
    globalScope.addEventListener(type, vitals.disconnect, { once: true, passive: true })
  })

  return vitals
}
