/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from './handle'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'

/**
 * Reports a supportability metric to the metrics feature through the event emitter. This is the one way to report a metric, from any feature or shared code. Prefer it over calling `handle` directly so the
 * channel and target feature are not repeated at every call site.
 * @param {import('./contextual-ee').ContextualEE} ee The emitter the metrics feature listens on.
 * @param {...*} args The metric name, followed by an optional numeric value to aggregate with it.
 * @returns {void}
 */
export function reportSupportabilityMetric (ee, ...args) {
  handle(SUPPORTABILITY_METRIC_CHANNEL, args, undefined, FEATURE_NAMES.metrics, ee)
}
