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
  thisFile = extractUrlsFromStack(getDeepStackTrace())[0]
} catch (err) {
  thisFile = extractUrlsFromStack(err)[0]
}

/** @type {(entry: PerformanceEntry) => boolean} - A shared function to determine if a performance entry is a valid script or link resource for evaluation */
const validEntryCriteria = entry => entry.initiatorType === 'script' || (['link', 'fetch'].includes(entry.initiatorType) && entry.name.endsWith('.js'))

/** @type {Map<string, ScriptCorrelation>} - Central registry for script correlations containing both DOM and Performance data */
export const scriptCorrelations = new Map()
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
 * Retrieves a script correlation by URL, falling back to use flexible matching (suffix matching in both directions) if no exact match is found
 * @param {string} targetUrl - The URL to find
 * @returns {ScriptCorrelation | undefined} - The correlation object if found
 */
function findCorrelation (targetUrl) {
  if (scriptCorrelations.has(targetUrl)) return scriptCorrelations.get(targetUrl)
  for (const [url, correlation] of scriptCorrelations) {
    if (urlsMatch(url, targetUrl)) return correlation
  }
}

/**
 * Gets or creates a script correlation entry
 * @param {string} url - The cleaned URL
 * @returns {ScriptCorrelation} - The correlation object
 */
function getOrCreateCorrelation (url) {
  const existing = findCorrelation(url)
  if (existing) return existing

  const correlation = new ScriptCorrelation(url)
  scriptCorrelations.set(url, correlation)

  // Keep size under control
  if (scriptCorrelations.size > 1000) {
    const firstKey = scriptCorrelations.keys().next().value
    scriptCorrelations.delete(firstKey)
  }

  return correlation
}

/** Set up a MutationObserver to detect script elements being added to the DOM */
if (globalScope.MutationObserver && globalScope.document) {
  const scriptMutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'SCRIPT' && node.src) {
          const cleanedSrc = cleanURL(node.src)
          const correlation = getOrCreateCorrelation(cleanedSrc)

          correlation.dom.start = now()
          correlation.dom.value = node

          const setEnd = () => { correlation.dom.end = now() }
          ;['load', 'error'].forEach(event => node.addEventListener(event, setEnd, { once: true }))
        }
      })
    })
  })

  scriptMutationObserver.observe(globalScope.document, {
    childList: true,
    subtree: true
  })
}

if (globalScope.PerformanceObserver?.supportedEntryTypes.includes('resource')) {
  /** We must track the script assets this way, because the performance buffer can fill up and when it does that
   * it stops accepting new entries (instead of dropping old entries), which means if the register API is called
   * after the buffer fills up we won't be able to get the script timing information from the resource timing API
  */
  const scriptObserver = new PerformanceObserver((list) => {
    list.getEntries().filter(validEntryCriteria).forEach((entry) => {
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
    timings.correlation = findCorrelation(mfeScriptUrl)

    // Use correlation's performance entry if available, otherwise check live performance API
    const performanceEntry = timings.correlation?.performance.value || performance.getEntriesByType('resource').find(e => entryMatchesUrl(e, mfeScriptUrl))

    if (performanceEntry) {
      applyPerformanceEntry(timings, performanceEntry)
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

    /*
     * Use getters here because the correlation data may arrive after this function returns the timing object, and we want to provide the most up-to-date timing information possible when the getters are accessed at harvest time.
     * The getters will fall back to fetchEnd if correlation data isn't available yet, which is our best approximation for script execution start when actual script timings can not be determined.
    */
    Object.defineProperty(timings, 'scriptStart', { get: () => timings.correlation?.script.start || timings.fetchEnd })
    Object.defineProperty(timings, 'scriptEnd', { get: () => timings.correlation?.script.end || timings.registeredAt })
  } catch (error) {
    // Don't let stack parsing errors break anything
  }

  return timings
}
