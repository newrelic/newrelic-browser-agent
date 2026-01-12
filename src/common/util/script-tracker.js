/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { chrome, gecko } from '../../features/jserrors/aggregate/compute-stack-trace'
import { globalScope } from '../constants/runtime'
import { cleanURL } from '../url/clean-url'

const scripts = new Set()

if (globalScope.PerformanceObserver?.supportedEntryTypes.includes('resource')) {
  const scriptTracker = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => scripts.add(entry))
  })
  scriptTracker.observe({ type: 'resource', buffered: true, filter: { initiatorType: 'script' } })
}

/**
 * Extracts URLs from stack traces using the same logic as compute-stack-trace.js
 * @param {string} stack The error stack trace
 * @returns {string[]} Array of cleaned URLs found in the stack trace
 */
function extractUrlsFromStack (stack) {
  if (!stack) return []

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
 * Given an error stack, return script timing information if a script can be found with the resource timing API
 * @param {Error.stack} stack
 * @returns {{fetchStart: number, fetchEnd: number}}
 */
export function findScriptTimingsFromStack (stack) {
  const timings = { fetchStart: 0, fetchEnd: 0 }
  if (scripts.size < 1 || !stack) return timings

  try {
    const stackUrls = extractUrlsFromStack(stack)
    const match = [...scripts].find(script => {
      const scriptUrl = cleanURL(script.name)
      return stackUrls.some(stackUrl => {
        // Try exact match, then partial matches for different URL formats
        return stackUrl === scriptUrl ||
               stackUrl.endsWith(scriptUrl) ||
               scriptUrl.endsWith(stackUrl)
      })
    })

    if (match) {
      timings.fetchStart = Math.floor(match.startTime)
      timings.fetchEnd = Math.floor(match.responseEnd)
    }
  } catch (error) {
    // Don't let stack parsing errors break anything
  }

  return timings
}
