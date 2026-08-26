/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../constants/runtime'
import { now } from '../timing/now'
import { CORRELATION_STALE_THRESHOLD_MS } from './script-tracker-constants'

/**
 * @typedef {import('../../loaders/api/register-api-types').RegisterAPITimings} RegisterAPITimings
 * @typedef {import('../../loaders/api/register-api-types').RegisterAPITarget} RegisterAPITarget
 * @typedef {import('../../loaders/api/register-api-types').RegisterAPIVitals} RegisterAPIVitals
 */

const isObservable = (node) => {
  try {
    return node?.textContent?.trim() || ['img', 'video', 'canvas', 'svg'].includes(node?.nodeName?.toLowerCase())
  } catch (e) {
    return false
  }
}

const isMatch = (dataset, target) => dataset?.nrMfeId === target.id && (!dataset?.nrMfeObserved || dataset?.nrMfeObserved === target.instance)

const escapeSelectorValue = (value) => {
  try {
    return globalScope.CSS.escape(value)
  } catch (e) {
    // give up
    return value
  }
}

/**
 * Check if node is within a specific MFE
 * @param {Node} node - DOM node to check
 * @param {string} id - MFE ID to match
 * @returns {boolean}
 */
const isInMFE = (node, target = {}) => {
  const id = target.id
  const instance = target.instance
  if (!node || !id || !instance) return false
  try {
    let curr = node.nodeType === 1 ? node : node.parentElement
    while (curr?.tagName) {
      if (isMatch(curr.dataset, target)) {
        curr.dataset.nrMfeObserved = instance // mark that this MFE has been observed for vitals
        return true
      }
      curr = curr.parentNode
    }
  } catch (e) {}
  return false
}

/**
 * Create mutation observer for MFE nodes
 * @param {string} id - MFE ID to track
 * @param {Function} onMatch - Callback when matching node is *added*
 * @returns {MutationObserver}
 */
const observeMutations = (target, onMatch) => {
  // Try to find existing MFE root
  const potentialMatches = globalScope.document?.querySelectorAll(`[data-nr-mfe-id="${escapeSelectorValue(target.id)}"]`)
  const mfeRoot = (Array.from(potentialMatches) || []).find(x => isMatch(x.dataset, target))
  let observingRoot = !!mfeRoot
  if (observingRoot) mfeRoot.dataset.nrMfeObserved ??= target.instance // mark that this MFE has been observed for vitals

  const obs = new globalScope.MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        // Check if this is the MFE root being added
        const elem = node.nodeType === 1 ? node : null
        if (!observingRoot && isMatch(elem?.dataset, target)) {
          // Found the root! Lets switch to observing just this subtree for performance reasons
          obs.disconnect()
          obs.observe(elem, { childList: true, subtree: true })
          observingRoot = true
          elem.dataset.nrMfeObserved = target.instance // mark that this MFE has been observed for vitals
        }

        // Only check isInMFE if we're observing the whole document; skip expensive ancestor walk when observing root
        if (isObservable(node) && (observingRoot || isInMFE(node, target))) {
          onMatch(node, obs)
        }
      })
    })
  })

  // If root exists, observe just that subtree; otherwise observe document to catch when root is added
  obs.observe(mfeRoot || globalScope.document, { childList: true, subtree: true })

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
 * @param {RegisterAPITarget} target - The MFE target to track vitals for
 * @param {RegisterAPITimings} timings - The timings object to use for relative time calculations
 * @returns {RegisterAPIVitals} An object containing the vitals values and a disconnect method to stop tracking
 */
export function trackMFEVitals (target, timings) {
  let fcpObservedAt
  let lcpObservedAt
  // Once disconnect() runs, no further vitals data should be written - even from an observer callback that was
  // already in flight when disconnect() was called.
  let disconnected = false

  const getTimeRelativeToScriptStart = (capturedAt) => {
    if (capturedAt == null) return capturedAt
    return capturedAt - (timings?.scriptStart || timings?.registeredAt || 0)
  }

  const vitals = {
    fcp: {
      // A clock freeze/tab suspend between script registration and first paint can make this value huge once the
      // tab resumes. Rather than report a multi-hour "FCP", drop it so bad data doesn't reach the backend.
      get value () {
        const relative = getTimeRelativeToScriptStart(fcpObservedAt)
        return relative > CORRELATION_STALE_THRESHOLD_MS ? undefined : relative
      },
      set value (v) { if (!disconnected) fcpObservedAt = v }
    },
    lcp: {
      // LCP can never occur before FCP, so if FCP was dropped as invalid, LCP is derived from the same untrustworthy clock and must be dropped too.
      get value () {
        if (vitals.fcp.value === undefined) return undefined
        return getTimeRelativeToScriptStart(lcpObservedAt)
      },
      set value (v) { if (!disconnected) lcpObservedAt = v }
    },
    cls: {
      value: undefined
    },
    inp: {
      value: undefined
    },
    disconnect: () => {}
  }

  if (!target || !isBrowserScope || !globalScope.MutationObserver || !globalScope.PerformanceObserver) return vitals

  const observers = []

  // If FCP hasn't been observed within this window, give up and shut down all observers.
  // Once FCP is observed, the other vitals are left to record until their natural lifespan ends.
  setTimeout(() => {
    if (!fcpObservedAt) vitals.disconnect()
  }, CORRELATION_STALE_THRESHOLD_MS)

  const populateVitalMinimums = () => {
    if (disconnected) return
    if (fcpObservedAt == null) {
      const capturedAt = now()
      // If the very first observed render already exceeds the window, the clock is untrustworthy for this
      // MFE (e.g. tab was frozen/suspended between registration and paint) - shut everything down instead
      // of seeding vitals with data derived from it.
      if (getTimeRelativeToScriptStart(capturedAt) > CORRELATION_STALE_THRESHOLD_MS) {
        vitals.disconnect()
        return
      }
      fcpObservedAt = capturedAt
    }
    lcpObservedAt ??= now()
    vitals.cls.value ??= 0
  }

  // Track FCP - first contentful paint
  const fcpObs = observeMutations(target, (_, obs) => {
    // An observed "FCP" means _something_ rendered, so at minimum we can populate all the baseline values for the vitals
    populateVitalMinimums()
    obs.disconnect()
  })
  observers.push(fcpObs)

  // Track LCP - largest contentful paint
  let largestSize = 0
  let resizeObs = null
  const observedElements = new Set()

  try {
    resizeObs = new globalScope.ResizeObserver((entries) => {
      if (disconnected) return
      entries.forEach((entry) => {
        try {
          const size = entry.contentRect.width * entry.contentRect.height
          if (size > largestSize) {
            largestSize = size
            vitals.lcp.value = now()
          }
          resizeObs.unobserve(entry.target)
        } catch (e) {
          // Element may be detached from DOM
        }
      })
    })
  } catch (e) {
    // ResizeObserver not supported
  }

  const lcpObs = observeMutations(target, (node) => {
    // an observed "LCP" means _something_ rendered, so at minimum we can make sure all the baseline values are populated for the vitals
    populateVitalMinimums()

    if (resizeObs) {
      try {
        const elem = node.nodeType === 1 ? node : node.parentElement
        if (elem && !observedElements.has(elem)) {
          observedElements.add(elem)

          // For media elements, wait for content to load before observing size
          if (elem.tagName === 'IMG') {
            if (elem.complete) {
              resizeObs.observe(elem)
            } else {
              elem.addEventListener('load', () => {
                resizeObs.observe(elem)
              }, { once: true })
            }
          } else if (elem.tagName === 'VIDEO') {
            // For video, wait for first frame (HAVE_CURRENT_DATA = 2)
            if (elem.readyState >= 2) {
              resizeObs.observe(elem)
            } else {
              elem.addEventListener('loadeddata', () => {
                resizeObs.observe(elem)
              }, { once: true })
            }
          } else {
            // For other elements, observe immediately
            resizeObs.observe(elem)
          }
        }
      } catch (e) {
        // Element may not be observable
      }
    }
  })

  if (resizeObs) observers.push(resizeObs)
  observers.push(lcpObs)

  // Track CLS - cumulative layout shift
  // Initialize CLS to 0 if browser supports it
  observePerformance(observers, { type: 'layout-shift', buffered: true }, (entry) => {
    if (disconnected || entry.hadRecentInput) return
    ;(entry.sources || []).some(source => {
      if (isInMFE(source.node, target)) {
        // an observed "CLS" means _something_ rendered for the MFE, so at minimum we can make sure all the baseline values are populated for the vitals
        populateVitalMinimums()
        vitals.cls.value += entry.value
        return true
      }
      return false
    })
  })

  // Track INP - interaction to next paint
  observePerformance(observers, { type: 'event', buffered: true, durationThreshold: 40 }, (entry) => {
    if (disconnected || !entry.interactionId || !isInMFE(entry.target, target)) return
    if (vitals.inp.value === undefined || entry.duration > vitals.inp.value) {
      // an observed "INP" means _something_ rendered for the MFE, so at minimum we can make sure all the baseline values are populated for the vitals
      populateVitalMinimums()
      vitals.inp.value = entry.duration
    }
  })

  const interactionEvents = ['pointerdown', 'keydown']
  const disconnectInteractionListeners = () => {
    interactionEvents.forEach(type => {
      globalScope.removeEventListener(type, handleInteraction, { passive: true })
    })
  }

  // Disconnect all observers
  vitals.disconnect = () => {
    disconnected = true
    // Disconnect all observers
    observers.forEach(obs => {
      try {
        obs?.disconnect()
      } catch (e) {
        // Observer may already be disconnected
      }
    })
    disconnectInteractionListeners()
    ;['visibilitychange', 'pagehide'].forEach(type => {
      globalScope.removeEventListener(type, vitals.disconnect, { once: true, passive: true })
    })
  }

  // Auto-disconnect LCP observer on user interaction (per Web Vitals spec)
  // CLS and INP continue tracking until visibility change or deregister
  const disconnectLCP = () => {
    try {
      lcpObs?.disconnect()
      resizeObs?.disconnect()
    } catch (e) {
      // Observer may already be disconnected
    }
  }

  const handleInteraction = (event) => {
    if (!isInMFE(event?.target, target)) return

    disconnectLCP()
    disconnectInteractionListeners()
  }

  interactionEvents.forEach(type => {
    globalScope.addEventListener(type, handleInteraction, { passive: true })
  })

  // Disconnect all observers on visibility change or page unload
  ;['visibilitychange', 'pagehide'].forEach(type => {
    globalScope.addEventListener(type, vitals.disconnect, { once: true, passive: true })
  })

  // If the MFE has already rendered something on the page before we could set up listeners, just populate vital
  // minimums immediately. Done last, once `observers` is fully populated and `vitals.disconnect` has its real
  // implementation, so a stale-clock detection here can actually tear everything down instead of no-op'ing.
  const existingRoots = globalScope.document?.querySelectorAll(`[data-nr-mfe-id="${escapeSelectorValue(target.id)}"]`)
  if (Array.from(existingRoots || []).some(x => isMatch(x.dataset, target))) populateVitalMinimums()

  return vitals
}
