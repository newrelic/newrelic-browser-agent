/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope } from '../constants/runtime'
import { cleanURL } from '../url/clean-url'
import { chrome, gecko } from './browser-stack-matchers'

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
  const timings = { fetchStart: 0, fetchEnd: 0, asset: undefined }
  /** @type {PerformanceResourceTiming[]} The list of script resource timing entries */
  const scripts = globalScope.performance?.getEntriesByType('resource').filter(entry => entry.initiatorType === 'script') || []
  if (scripts.length < 1 || !stack) return timings

  try {
    const mfeScriptUrl = extractUrlsFromStack(stack).at(-1) // array of URLs from the stack of the register API caller, the MFE script should be at the bottom
    const match = scripts.find(script => {
      const scriptUrl = cleanURL(script.name)
      // Try exact match, then partial matches for different URL formats
      return mfeScriptUrl === scriptUrl || mfeScriptUrl.endsWith(scriptUrl) || scriptUrl.endsWith(mfeScriptUrl)
    })

    if (match) {
      timings.fetchStart = Math.floor(match.startTime)
      timings.fetchEnd = Math.floor(match.responseEnd)
      timings.asset = match.name
    }
  } catch (error) {
    // Don't let stack parsing errors break anything
  }

  return timings
}
