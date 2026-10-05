/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../constants/runtime'
import { reportSupportabilityMetric } from '../event-emitter/report-supportability-metric'
import { GLOBAL_EVENT_NAMESPACE } from './global-event'

const WARN = 'warn'
/** The global event is public, so anything on the page can dispatch one. Only a plain warning code (a whole number of up to 3 digits) becomes part of a metric name. */
const isWarningCode = (code) => Number.isInteger(code) && code > 0 && code < 1000

/**
 * Reports a `Warn/<code>/Seen` supportability metric each time the agent warns (see `warn()`), by listening for the global `newrelic` event it
 * dispatches. Only the code is reported, never the warning's secondary argument, which may hold customer data.
 * @param {import('../event-emitter/contextual-ee').ContextualEE} ee The emitter to report the metrics on.
 * @param {function(): boolean} [isEnabled] Asked for each warning. Nothing drains the metrics of an agent whose metrics feature is off, so it must return false
 *   then, or they would pile up in the emitter.
 * @returns {function(): void} Stops listening.
 */
export function reportWarnings (ee, isEnabled = () => true) {
  const listener = ({ detail }) => {
    if (detail?.name === WARN && isWarningCode(detail.data?.code) && isEnabled()) reportSupportabilityMetric(ee, `Warn/${detail.data.code}/Seen`)
  }
  globalScope.addEventListener(GLOBAL_EVENT_NAMESPACE, listener)
  return () => globalScope.removeEventListener(GLOBAL_EVENT_NAMESPACE, listener)
}
