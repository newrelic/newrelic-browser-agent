/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope } from '../constants/runtime'
import { now } from '../timing/now'
import { cleanURL } from '../url/clean-url'
import { chrome, chromeEval, gecko } from '../util/browser-stack-matchers'
import { ScriptCorrelation } from './script-correlation'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 */

/** export for testing purposes */
export let thisFile
try {
  thisFile = extractUrlsFromStack(getDeepStackTrace()).at(0)
} catch (err) {
  thisFile = extractUrlsFromStack(err).at(0)
}

/** @type {(entry: PerformanceEntry) => boolean} - A shared function to determine if a performance entry is a valid script or link resource for evaluation */
const validEntryCriteria = entry => entry.initiatorType === 'script' || (['link', 'fetch'].includes(entry.initiatorType) && entry.name.endsWith('.js'))

/** @type {Map<string, ScriptCorrelation>} - Central registry for script correlations containing both DOM and Performance data */
const scriptCorrelations = new Map()
/** @type {Array<{ test: (entry: PerformanceEntry) => boolean, addedAt: number }>} an array of PerformanceObserver subscribers to check for late emissions */
let poSubscribers = []

/**
 * Checks if two URLs match using flexible suffix matching
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @returns {boolean} True if URLs match
 */
function urlsMatch (url1, url2) {
  return url1.endsWith(url2) || url2.endsWith(url1)
}

/**
 * Retrieves a script correlation by URL, using flexible matching (suffix matching in both directions)
 * @param {string} targetUrl - The URL to find
 * @returns {[string, ScriptCorrelation] | undefined} - The [key, value] tuple if found
 */
function findCorrelation (targetUrl) {
  return [...scriptCorrelations.entries()].find(([url]) => urlsMatch(url, targetUrl))
}

/**
 * Gets or creates a script correlation entry
 * @param {string} url - The cleaned URL
 * @returns {ScriptCorrelation} - The correlation object
 */
function getOrCreateCorrelation (url) {
  const existing = findCorrelation(url)
  if (existing) return existing[1]

  const correlation = new ScriptCorrelation(url)
  scriptCorrelations.set(url, correlation)

  // Keep size under control
  if (scriptCorrelations.size > 1000) {
    const firstKey = scriptCorrelations.keys().next().value
    scriptCorrelations.delete(firstKey)
  }

  return correlation
}

/**
 * Returns all script correlations as an array for holistic viewing
 * @returns {ScriptCorrelation[]} Array of all tracked script correlations
 */
export function getScriptCorrelations () {
  return [...scriptCorrelations.values()]
}

if (globalScope.PerformanceObserver?.supportedEntryTypes.includes('resource')) {
  /** Set up a MutationObserver to detect script elements being added to the DOM */
  if (globalScope.MutationObserver && globalScope.document) {
    const scriptMutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'SCRIPT') {
            const scriptSrc = node.src
            if (scriptSrc) {
              const cleanedSrc = cleanURL(scriptSrc)
              const correlation = getOrCreateCorrelation(cleanedSrc)

              correlation.dom.start = now()
              correlation.dom.value = node

              // Add load event listener to capture when script finishes loading
              node.addEventListener('load', () => {
                correlation.dom.end = now()
              }, { once: true })

              // Also capture error events
              node.addEventListener('error', () => {
                correlation.dom.end = now()
              }, { once: true })
            }
          }
        })
      })
    })

    scriptMutationObserver.observe(globalScope.document, {
      childList: true,
      subtree: true
    })
  }

  /** We must track the script assets this way, because the performance buffer can fill up and when it does that
   * it stops accepting new entries (instead of dropping old entries), which means if the register API is called
   * after the buffer fills up we won't be able to get the script timing information from the resource timing API
  */
  const scriptObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (validEntryCriteria(entry)) {
        // Update correlation with performance data (creates entry if needed)
        const entryUrl = cleanURL(entry.name)
        const correlation = getOrCreateCorrelation(entryUrl)
        correlation.performance.start = Math.floor(entry.startTime)
        correlation.performance.end = Math.floor(entry.responseEnd)
        correlation.performance.value = entry

        // Clear resolved or expired subscribers
        const canClear = []
        poSubscribers.forEach(({ test, addedAt }, idx) => {
          if (test(entry) || now() - addedAt > 10000) canClear.push(idx)
        })
        poSubscribers = poSubscribers.filter((_, idx) => !canClear.includes(idx))
      }
    })
  })
  scriptObserver.observe({ type: 'resource', buffered: true })
}

/**
 * Extracts URLs from stack traces using the same logic as compute-stack-trace.js
 * @param {string} stack The error stack trace
 * @returns {string[]} Array of cleaned URLs found in the stack trace
 */
export function extractUrlsFromStack (stack) {
  if (!stack || typeof stack !== 'string') return []

  const urls = new Set()
  const lines = stack.split('\n')

  for (const line of lines) {
    // Try gecko format first, then chrome
    const parts = line.match(gecko) || line.match(chrome) || line.match(chromeEval)
    if (parts && parts[2]) {
      urls.add(cleanURL(parts[2]))
    } else {
      // Fallback: match URLs using a generic .js pattern (non-greedy to handle ports and query params)
      const fallbackMatch = line.match(/\(([^)]+\.js):\d+:\d+\)/) || line.match(/^\s+at\s+([^\s(]+\.js):\d+:\d+/)
      if (fallbackMatch && fallbackMatch[1]) {
        urls.add(cleanURL(fallbackMatch[1]))
      }
    }
  }
  return [...urls]
}

/**
 * Returns a deep stack trace by temporarily increasing the stack trace limit.
 * @returns {Error.stack | undefined}
 */
export function getDeepStackTrace () {
  let stack
  try {
    const originalStackLimit = Error.stackTraceLimit
    Error.stackTraceLimit = 50
    stack = new Error().stack
    Error.stackTraceLimit = originalStackLimit
  } catch (e) {
    stack = new Error().stack
  }
  return stack
}

/**
 * Indicates whether the provided URL matches any script preload link tags in the document.
 * @param {string} targetUrl The URL to match against preload tags
 * @returns {boolean} True if a matching preload link is found, false otherwise
 */
function wasPreloaded (targetUrl) {
  if (!targetUrl || !globalScope.document) return false

  try {
    const linkTags = globalScope.document.querySelectorAll('link[rel="preload"][as="script"]')
    for (const link of linkTags) {
      // link.href is resolved to an absolute URL by the browser (even if supplied as relative), so we can match exactly against the cleaned target URL
      if (cleanURL(link.href) === targetUrl) return true
    }
  } catch (error) {
    // Don't let DOM parsing errors break anything
  }
  return false
}

/**
 * Checks if a performance entry matches the target MFE script URL
 * @param {PerformanceResourceTiming} entry - The resource timing entry
 * @param {string} targetUrl - The MFE script URL to match
 * @returns {boolean} True if the entry matches
 */
function entryMatchesUrl (entry, targetUrl) {
  const entryUrl = cleanURL(entry.name)
  return urlsMatch(entryUrl, targetUrl)
}

/**
 * Applies performance entry timing data to a timings object
 * @param {RegisterAPITimings} timings - The timings object to update
 * @param {PerformanceResourceTiming} entry - The performance entry
 */
function applyPerformanceEntry (timings, entry) {
  timings.fetchStart = Math.floor(entry.startTime)
  timings.fetchEnd = Math.floor(entry.responseEnd)
  timings.asset = entry.name
  timings.type = entry.initiatorType
}

/**
 * Finds a matching performance entry for the MFE script URL
 * @param {string} mfeScriptUrl - The MFE script URL to find
 * @returns {PerformanceResourceTiming | undefined} The matching entry if found
 */
function findMatchingPerformanceEntry (mfeScriptUrl) {
  // Try performance API first (fastest), then check correlations as fallback
  // Correlations contain buffered entries that may have been dropped from performance API
  const match = performance.getEntriesByType('resource').find(e => entryMatchesUrl(e, mfeScriptUrl))
  if (match) return match

  // Fallback: search through correlations for performance entries
  for (const correlation of scriptCorrelations.values()) {
    if (correlation.performance.value && entryMatchesUrl(correlation.performance.value, mfeScriptUrl)) {
      return correlation.performance.value
    }
  }
}

/**
 * Uses the stack of the initiator function, returns script timing information if a script can be found with the resource timing API matching the URL found in the stack.
 * @returns {RegisterAPITimings} Object containing script fetch start and end times, and the asset URL if found
 */
export function findScriptTimings () {
  const timings = { registeredAt: now(), reportedAt: undefined, fetchStart: 0, fetchEnd: 0, scriptStart: 0, scriptEnd: 0, asset: undefined, type: 'unknown' }
  const stack = getDeepStackTrace()
  if (!stack) return timings

  const navUrl = globalScope.performance?.getEntriesByType('navigation')?.[0]?.name || ''

  try {
    const urls = extractUrlsFromStack(stack)
    // Filter out agent file from URLs (unless it's the only one)
    const mfeScriptUrl = (urls.length > 1 ? urls.filter(line => !urlsMatch(thisFile, line)) : urls).at(0)
    if (!mfeScriptUrl) return timings

    // Check for inline script
    if (navUrl.includes(mfeScriptUrl)) {
      timings.asset = cleanURL(navUrl)
      timings.type = 'inline'
      return timings
    }

    // Get correlation data
    const correlation = findCorrelation(mfeScriptUrl)?.[1]

    // Try to find matching performance entry
    const match = findMatchingPerformanceEntry(mfeScriptUrl)

    if (match) {
      applyPerformanceEntry(timings, match)
    } else if (wasPreloaded(mfeScriptUrl)) {
      // Handle preloaded scripts that may report late
      timings.asset = mfeScriptUrl
      timings.type = 'preload'

      // Subscribe to late performance observer callbacks
      poSubscribers.push({
        addedAt: now(),
        test: (entry) => {
          if (entryMatchesUrl(entry, mfeScriptUrl)) {
            applyPerformanceEntry(timings, entry)
            return true
          }
          return false
        }
      })
    }

    Object.defineProperty(timings, 'scriptStart', { get: () => correlation?.script.start || timings.fetchEnd })
    Object.defineProperty(timings, 'scriptEnd', { get: () => correlation?.script.end || timings.registeredAt })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('ERROR SETTING UP SCRIPT TIMINGS:', error)
    // Don't let stack parsing errors break anything
  }

  return timings
}
