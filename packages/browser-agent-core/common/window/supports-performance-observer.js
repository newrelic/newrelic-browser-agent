/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function supportsPerformanceObserver () {
  return 'PerformanceObserver' in window && typeof window.PerformanceObserver === 'function'
}
