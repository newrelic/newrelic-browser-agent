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
 * @returns {PerformanceObserver}
 */
const observePerformance = (observers, config, onEntry) => {
  const obs = new globalScope.PerformanceObserver(list => {
    list.getEntries().forEach(onEntry)
  })
  try {
    obs.observe(config)
    observers.push(obs)
  } catch (e) {}
  return obs
}

/**
 * Tracks all Core Web Vitals for a specific MFE.
 * @param {string} id - The MFE ID to track
 * @returns {{fcp: number|null, lcp: number|null, cls: number, inp: number|null, disconnect: Function}}
 */
export function trackMFEVitals (id) {
  const vitals = {
    fcp: null,
    lcp: null,
    cls: 0,
    inp: null,
    disconnect: () => {}
  }

  if (!id || !isBrowserScope || !globalScope.MutationObserver || !globalScope.PerformanceObserver) return vitals

  const observers = []

  // Track FCP - first contentful paint
  observeMutations(id, (node, obs) => {
    vitals.fcp = now()
    obs.disconnect()
  })

  // Track LCP - largest contentful paint
  let largestSize = 0
  const lcpObs = observeMutations(id, (node) => {
    const elem = node.nodeType === 1 ? node : node.parentElement
    const rect = elem.getBoundingClientRect()
    const size = rect.width * rect.height
    if (size > largestSize) {
      largestSize = size
      vitals.lcp = now()
    }
  })
  observers.push(lcpObs)

  // Track CLS - cumulative layout shift
  observePerformance(observers, { type: 'layout-shift', buffered: true }, (entry) => {
    if (entry.hadRecentInput) return
    (entry.sources || []).some(source => {
      if (isInMFE(source.node, id)) {
        vitals.cls += entry.value
        return true
      }
      return false
    })
  })

  // Track INP - interaction to next paint
  observePerformance(observers, { type: 'event', buffered: true, durationThreshold: 16 }, (entry) => {
    if (!entry.interactionId || !entry.target || !isInMFE(entry.target, id)) return
    if (vitals.inp === null || entry.duration > vitals.inp) {
      vitals.inp = entry.duration
    }
  })

  // Disconnect all observers
  vitals.disconnect = () => observers.forEach(obs => obs.disconnect())

  // Auto-disconnect LCP/CLS/INP on interaction or visibility change
  ;['click', 'keydown', 'scroll', 'visibilitychange', 'pagehide'].forEach(type => {
    globalScope.addEventListener(type, vitals.disconnect, { once: true, passive: true })
  })

  return vitals
}
