/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Contains constants about the environment the agent is running
 * within. These values are derived at the time the agent is first loaded.
 * @copyright 2023 New Relic Corporation. All rights reserved.
 * @license Apache-2.0
 */

import { now } from '../timing/now'

/**
 * Indicates if the agent is running within a normal browser window context.
 */
export const isBrowserScope =
  typeof window !== 'undefined' &&
    !!window.document

/**
 * Indicates if the agent is running within a worker context.
 */
export const isWorkerScope =
  typeof WorkerGlobalScope !== 'undefined' &&
    (
      (
        typeof self !== 'undefined' &&
        self instanceof WorkerGlobalScope &&
        self.navigator instanceof WorkerNavigator
      ) ||
    (
      (
        typeof globalThis !== 'undefined' &&
        globalThis instanceof WorkerGlobalScope &&
        globalThis.navigator instanceof WorkerNavigator
      )
    )
    )

export const globalScope = isBrowserScope
  ? window
  : typeof WorkerGlobalScope !== 'undefined' && ((
    typeof self !== 'undefined' &&
      self instanceof WorkerGlobalScope &&
      self
  ) || (
    typeof globalThis !== 'undefined' &&
      globalThis instanceof WorkerGlobalScope &&
      globalThis
  ))

export const loadedAsDeferredBrowserScript = globalScope?.document?.readyState === 'complete'

export const initiallyHidden = Boolean(globalScope?.document?.visibilityState === 'hidden')

export const initialLocation = '' + globalScope?.location

export const isiOS = /iPad|iPhone|iPod/.test(globalScope.navigator?.userAgent)

/**
 * Shared Web Workers introduced in iOS 16.0+ and n/a in 15.6-
 *
 * It was discovered in Safari 14 (https://bugs.webkit.org/show_bug.cgi?id=225305) that the buffered flag in PerformanceObserver
 * did not work. This affects our onFCP metric in particular since web-vitals uses that flag to retrieve paint timing entries.
 * This was fixed in v16+.
 */
export const iOSBelow16 = (isiOS && typeof SharedWorker === 'undefined')

export const ffVersion = (() => {
  const match = globalScope.navigator?.userAgent?.match(/Firefox[/\s](\d+\.\d+)/)
  if (Array.isArray(match) && match.length >= 2) {
    return +match[1]
  }

  return 0
})()

/**
 * Represents the absolute timestamp in milliseconds that the page was loaded
 * according to the browser's local clock.
 * @type {number}
 */
export const originTime = Date.now() - now()

/**
 * Gets the first navigation entry from the Performance Timeline API.
 * Returns undefined if the entry is not available or invalid.
 * Matches web-vitals validation: checks that responseStart exists, is positive, and is not larger than current time.
 * See: https://github.com/GoogleChrome/web-vitals/issues/137
 * @returns {PerformanceNavigationTiming | undefined}
 */
export const getNavigationEntry = () => {
  const navigationEntry = globalScope?.performance?.getEntriesByType?.('navigation')?.[0]
  if (navigationEntry &&
      navigationEntry.responseStart > 0 &&
      navigationEntry.responseStart < globalScope.performance.now()) {
    return navigationEntry
  }
}
