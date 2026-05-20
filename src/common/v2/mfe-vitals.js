/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../constants/runtime'
import { now } from '../timing/now'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 */

const isObservable = (node) => node?.nodeType === 1 || ['IMG', 'VIDEO', 'CANVAS', 'SVG'].includes(node?.nodeName)

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
  try {
    const clsObs = new globalScope.PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.hadRecentInput) return
        (entry.sources || []).some(source => {
          if (isInMFE(source.node, id)) {
            vitals.cls += entry.value
            return true
          }
          return false
        })
      })
    })
    clsObs.observe({ type: 'layout-shift', buffered: true })
    observers.push(clsObs)
    vitals.cls = 0
  } catch (e) {}

  // Track INP - interaction to next paint
  try {
    const inpObs = new globalScope.PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.interactionId && entry.target && isInMFE(entry.target, id) && (vitals.inp === null || entry.duration > vitals.inp)) {
          vitals.inp = entry.duration
        }
      })
    })
    inpObs.observe({ type: 'event', buffered: true, durationThreshold: 16 })
    observers.push(inpObs)
  } catch (e) {}

  // Disconnect all observers
  vitals.disconnect = () => observers.forEach(obs => obs?.disconnect?.())

  // Auto-disconnect LCP observer on user interaction (per Web Vitals spec)
  const disconnectLCP = () => lcpObs?.disconnect?.()
  ;['click', 'keydown', 'scroll', 'visibilitychange', 'pagehide'].forEach(type => {
    const disconnect = type === 'visibilitychange' || type === 'pagehide' ? vitals.disconnect : disconnectLCP
    globalScope.addEventListener(type, disconnect, { once: true, passive: true })
  })

  return vitals
}
