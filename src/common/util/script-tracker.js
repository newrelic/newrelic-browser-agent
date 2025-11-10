/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export const scripts = new Set()

const scriptTracker = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => scripts.add(entry))
})
scriptTracker.observe({ type: 'resource', buffered: true, filter: { initiatorType: 'script' } })

/**
 * Normalizes URLs for comparison by removing query params, fragments, and handling relative paths
 * @param {string} url The URL to normalize
 * @returns {string} The normalized URL path
 */
export function normalizeUrl (url) {
  if (!url) return ''
  try {
    // Handle absolute URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url)
      return parsed.pathname
    }
    // Handle relative URLs - remove query params and fragments
    return url.split('?')[0].split('#')[0]
  } catch {
    // Fallback for malformed URLs
    return url.split('?')[0].split('#')[0]
  }
}

/**
 * Extracts URLs from stack traces across different browser formats
 * @param {string} stack The error stack trace
 * @returns {string[]} Array of URLs found in the stack trace
 */
export function extractUrlsFromStack (stack) {
  const urls = []
  const lines = stack.split('\n')

  for (const line of lines) {
    // Chrome/Edge format: "at functionName (https://example.com/script.js:123:45)"
    const chromeMatch = line.match(/https?:\/\/[^\s)]+/)

    // Firefox format: "functionName@https://example.com/script.js:123:45"
    const firefoxMatch = line.match(/@(https?:\/\/[^\s:]+)/)

    if (chromeMatch) {
      // Remove line:column numbers from the URL
      const cleanUrl = chromeMatch[0].replace(/:\d+:\d+$/, '')
      urls.push(cleanUrl)
    }
    if (firefoxMatch) {
      // Remove line:column numbers from the URL
      const cleanUrl = firefoxMatch[1].replace(/:\d+:\d+$/, '')
      urls.push(cleanUrl)
    }
  }

  return [...new Set(urls)] // Remove duplicates
}
