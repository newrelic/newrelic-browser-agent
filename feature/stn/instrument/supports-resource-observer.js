/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = function supportsResourceTimingPerfObserver () {
  return 'PerformanceObserver' in window &&
    typeof window.PerformanceObserver === 'function' && 
    'supportedEntryTypes' in window.PerformanceObserver &&
    window.PerformanceObserver.supportedEntryTypes instanceof Array
    && window.PerformanceObserver.supportedEntryTypes.includes('resource')
}