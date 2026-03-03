/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope } from '../constants/runtime'
import { now } from '../timing/now'
import { cleanURL } from '../url/clean-url'
import { chrome, gecko } from './browser-stack-matchers'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 */

/** @type {(entry: PerformanceEntry) => boolean} - A shared function to determine if a performance entry is a valid script or link resource for evaluation */
const validEntryCriteria = entry => entry.initiatorType === 'script' || (entry.initiatorType === 'link' && entry.name.endsWith('.js'))

/** @type {Set<PerformanceResourceTiming>} - A set of resource timing objects that are "valid" -- see "validEntryCriteria" */
const scripts = new Set()
/** @type {Array<{ test: (entry: PerformanceEntry) => boolean, addedAt: number }>} an array of PerformanceObserver subscribers to check for late emissions */
let poSubscribers = []

if (globalScope.PerformanceObserver?.supportedEntryTypes.includes('resource')) {
  /** We must track the script assets this way, because the performance buffer can fill up and when it does that
   * it stops accepting new entries (instead of dropping old entries), which means if the register API is called
   * after the buffer fills up we won't be able to get the script timing information from the resource timing API
  */
  const scriptObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (validEntryCriteria(entry)) {
        if (scripts.size > 250) scripts.delete(scripts.values().next().value) // keep the set from growing indefinitely, we only need to check recent entries against the stack of the register API caller, so we can drop old entries as new ones come in
        scripts.add(entry)
        const canClear = []
        poSubscribers.forEach(({ test, addedAt }, idx) => {
          if (test(entry) || now() - addedAt > 10000) canClear.push(idx) // Clear subscribers that have resolved or have been pending for more than 10 seconds
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
function extractUrlsFromStack (stack) {
  if (!stack || typeof stack !== 'string') return []

  const urls = new Set()
  const lines = stack.split('\n')

  for (const line of lines) {
    // Try gecko format first, then chrome
    const parts = line.match(gecko) || line.match(chrome)
    if (parts && parts[2]) {
      urls.add(cleanURL(parts[2]))
    }
  }
  return [...urls]
}

/**
 * Returns a deep stack trace by temporarily increasing the stack trace limit.
 * @returns {Error.stack | undefined}
 */
function getDeepStackTrace () {
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
 * Uses the stack of the initiator function, returns script timing information if a script can be found with the resource timing API matching the URL found in the stack.
 * @returns {RegisterAPITimings} Object containing script fetch start and end times, and the asset URL if found
 */
export function findScriptTimings () {
  const timings = { registeredAt: now(), reportedAt: undefined, fetchStart: 0, fetchEnd: 0, asset: undefined, type: 'unknown' }
  const stack = getDeepStackTrace()
  if (!stack) return timings
  const navUrl = globalScope.performance?.getEntriesByType('navigation')?.find(entry => entry.initiatorType === 'navigation')?.name || ''

  try {
    const mfeScriptUrl = extractUrlsFromStack(stack).at(-1) // array of URLs from the stack of the register API caller, the MFE script should be at the bottom
    if (!mfeScriptUrl) return timings
    if (navUrl.includes(mfeScriptUrl)) {
      // this means the stack is indicating that the registration came from an inline script or eval, so we won't find a matching script resource - return early with just the URL
      timings.asset = cleanURL(navUrl)
      timings.type = 'inline'
      return timings
    }

    // try to find it in the static list, which updates faster than the PO.  This cant be solely trusted, since the buffer can fill up and stop accepting entries,
    // but it can still help in cases where the check is made before the asset is emitted by the performance observer and the buffer is not full. Fallback to checking the PO
    // entries that have been buffered as seen in the PO callback if its not found in the static list.
    const match = performance.getEntriesByType('resource').find(entryMatchesMfe) || [...scripts].find(entryMatchesMfe)

    if (match) { setMatchedAttributes(match) } else {
      // We didnt find a match with the PO, nor a static lookup... check if its preloaded and if so, set basic fallbacks and try to associate with a later script entry if possible, this can happen if the preload is reported late in the PO observer callback
      if (wasPreloaded(mfeScriptUrl)) {
        timings.asset = mfeScriptUrl
        timings.type = 'preload'
        // wait for a late PO callback...  The timings object can be mutated after the fact since we return a pointer and not a cloned object
        poSubscribers.push({
          addedAt: now(),
          test: (entry) => {
            if (entryMatchesMfe(entry)) {
              setMatchedAttributes(entry)
              return true // return true so that we know to clear this callback from the pending list since we found our match, otherwise it will stay in the list and be called for future entries which is unnecessary after we found our match and can cause performance issues if there are a lot of future entries and pending callbacks
            }
            return false
          }
        })
      }
    }

    /**
     * A matcher function to determine if a performance entry corresponds to the MFE script based on URL matching. It checks if either the entry URL ends with the MFE script URL or vice versa, to account for potential differences in how URLs are represented in the stack trace versus the resource timing entries.
     * @param {PerformanceResourceTiming} entry - The resource timing entry to compare to the MFE script
     * @returns {boolean} True if we think the entry matches the MFE script, false otherwise
     */
    function entryMatchesMfe (entry) {
      const entryUrl = cleanURL(entry.name)
      return entryUrl.endsWith(mfeScriptUrl) || mfeScriptUrl.endsWith(entryUrl)
    }

    /**
     * A helper function to set the matched timing attributes on the timings object based on a performance entry. This is called when we have identified a resource timing entry that we believe corresponds to the MFE script, and we want to extract the fetch start and end times, as well as the asset URL and type.
     * @param {PerformanceResourceTiming} entry - The resource timing entry to base values off of
     */
    function setMatchedAttributes (entry) {
      timings.fetchStart = Math.floor(entry.startTime)
      timings.fetchEnd = Math.floor(entry.responseEnd)
      timings.asset = entry.name
      timings.type = entry.initiatorType
    }
  } catch (error) {
    // Don't let stack parsing errors break anything
  }

  return timings
}
