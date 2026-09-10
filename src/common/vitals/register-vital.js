/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Invokes a web-vitals registration (e.g. `onLCP(callback)`), tolerating environments where the registration itself
 * throws. web-vitals >= 5 reads Performance Timeline APIs such as `performance.getEntriesByType` unguarded when a
 * metric is registered; where those are missing the metric is simply never reported, instead of the throw failing
 * the feature that imported it.
 * @param {() => void} register
 */
export function registerVital (register) {
  try {
    register()
  } catch (e) {
    // metric unavailable in this environment
  }
}
