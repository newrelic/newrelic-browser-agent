/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isBrowserScope } from '../constants/runtime'

/**
 * Whether this browser supports the `soft-navigation` PerformanceObserver entry type (Chrome 151+, experimental
 * as of this writing). Used to compare native soft-navigation detection coverage against the `soft_navigations`
 * feature's click/history/mutation heuristic, and stamped onto every {@link Interaction} so customers can query
 * rollout coverage by browser (e.g. `SELECT percentage(count(*), WHERE softNavApiSupported = true) FACET userAgentOS`).
 * @type {boolean}
 */
export let softNavApiSupported = false

if (isBrowserScope) {
  try {
    softNavApiSupported = !!PerformanceObserver?.supportedEntryTypes?.includes('soft-navigation')
  } catch (e) {
    // leave as false -- environment doesn't support the capability check itself
  }
}
