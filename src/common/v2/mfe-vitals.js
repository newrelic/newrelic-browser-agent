/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../constants/runtime'
import { now } from '../timing/now'
// import { cleanURL } from '../url/clean-url'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 */

/**
 * Generate a simple CSS selector for an element
 * @param {Element} elem - The element to generate selector for
 * @returns {string|null} CSS selector or null if element is invalid
 */
// const getElementSelector = (elem) => {
//   try {
//     if (!elem || !elem.tagName) return null

//     let selector = elem.tagName.toLowerCase()
//     if (elem.id) selector += `#${elem.id}`
//     else if (elem.className && typeof elem.className === 'string') {
//       const classes = elem.className.trim().split(/\s+/).slice(0, 2).join('.')
//       if (classes) selector += `.${classes}`
//     }
//     return selector
//   } catch (e) {
//     return null
//   }
// }

/**
 * Extract URL from an element (for images, videos, etc.)
 * @param {Element} elem - The element to extract URL from
 * @returns {string|null} Cleaned URL or null
 */
// const getElementURL = (elem) => {
//   try {
//     if (!elem) return null

//     // For images and videos
//     if (elem.src) return cleanURL(elem.src)

//     // For elements with background images
//     const bgImage = globalScope.getComputedStyle?.(elem)?.backgroundImage
//     if (bgImage && bgImage !== 'none') {
//       const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/)
//       if (match?.[1]) return cleanURL(match[1])
//     }

//     return null
//   } catch (e) {
//     return null
//   }
// }

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
 * @returns {{fcp: object|null, lcp: object|null, cls: object|null, inp: object|null, disconnect: Function}}
 */
export function trackMFEVitals (id, timings) {
  const vitals = {
    fcp: null,
    lcp: null,
    cls: null,
    inp: null,
    disconnect: () => {}
  }

  if (!id || !isBrowserScope || !globalScope.MutationObserver || !globalScope.PerformanceObserver) return vitals

  const observers = []

  const getNowRelativeToScriptStart = (capturedAt) => {
    return capturedAt - (timings?.scriptStart || timings?.registeredAt || 0)
  }

  // Track FCP - first contentful paint
  observeMutations(id, (node, obs) => {
    if (vitals.fcp === null) {
      const capturedAt = now()
      vitals.fcp = {
        get value () { return getNowRelativeToScriptStart(capturedAt) }
      }
      obs.disconnect()
    }
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
        const capturedAt = now()
        vitals.lcp = {
          get value () { return getNowRelativeToScriptStart(capturedAt) }
        }
      }
    } catch (e) {
      // Element may be detached from DOM
    }
  })
  observers.push(lcpObs)

  // Track CLS - cumulative layout shift
  // Initialize CLS to 0 if browser supports it
  observePerformance(observers, { type: 'layout-shift', buffered: true }, (entry) => {
    vitals.cls ??= { value: 0 }
    if (entry.hadRecentInput) return
    ;(entry.sources || []).some(source => {
      if (isInMFE(source.node, id)) {
        vitals.cls.value += entry.value
        return true
      }
      return false
    })
  })

  // Track INP - interaction to next paint
  observePerformance(observers, { type: 'event', buffered: true, durationThreshold: 16 }, (entry) => {
    if (!entry.interactionId || !entry.target || !isInMFE(entry.target, id)) return
    if (vitals.inp === null || entry.duration > vitals.inp.value) {
      vitals.inp = {
        value: entry.duration
      }
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
    globalScope.addEventListener(type, (event) => { if (isInMFE(event?.target, id)) disconnectLCP() }, { once: true, passive: true })
  })

  // Disconnect all observers on visibility change or page unload
  ;['visibilitychange', 'pagehide'].forEach(type => {
    globalScope.addEventListener(type, vitals.disconnect, { once: true, passive: true })
  })

  return vitals
}
