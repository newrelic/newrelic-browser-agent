/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Invokes a web-vitals registration (e.g. `onLCP(callback)`), tolerating environments where the registration itself
 * throws. web-vitals >= 5 reads Performance Timeline APIs such as `performance.getEntriesByType` unguarded when a
 * metric is registered; where those are missing the metric is simply never reported, instead of the throw failing
 * the feature that imported it.
 *
 * web-vitals >= 6 also calls ES2022 `Array.prototype` methods inside its own observer callbacks, out of reach of this
 * try/catch, so the registration is skipped where any method in `requires` is missing (e.g. `at` before Chromium 92).
 * @param {() => void} register
 * @param {string[]} [requires=[]] - `Array.prototype` methods the metric's web-vitals code calls, e.g. `['at']`
 */
export function registerVital (register, requires = []) {
  if (!requires.every(method => typeof Array.prototype[method] === 'function')) return
  try {
    register()
  } catch (e) {
    // metric unavailable in this environment
  }
}
