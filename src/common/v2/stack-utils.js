/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { cleanURL } from '../url/clean-url'
import { chrome, chromeEval, gecko } from '../util/browser-stack-matchers'

/*
 * Pure stack-trace helpers. These live apart from script-tracker.js on purpose: they are needed by code that runs in
 * every agent (see ./utils.js, used by the wrap-* modules), and importing script-tracker.js from there would drag in
 * the MFE script-tracking machinery for agents that never register an MFE.
 */

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
