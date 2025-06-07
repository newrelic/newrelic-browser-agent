/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { now } from '../../../common/timing/now'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { LOGGING_EVENT_EMITTER_CHANNEL, LOG_LEVELS } from '../constants'

/**
   * @param {ContextualEE} ee - The contextual ee tied to the instance
   * @param {string} message - the log message string
   * @param {{[key: string]: *}} customAttributes - The log's custom attributes if any
   * @param {enum} level - the log level enum
   * @param {object=} target - the optional target provided by an api call
   */
export function bufferLog (ee, message, customAttributes = {}, level = LOG_LEVELS.INFO, target, timestamp = now()) {
  handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/logging/${level.toLowerCase()}/called`], undefined, FEATURE_NAMES.metrics, ee)
  handle(LOGGING_EVENT_EMITTER_CHANNEL, [timestamp, message, customAttributes, level, target], undefined, FEATURE_NAMES.logging, ee)
}

/**
 * Checks if a supplied log level is acceptable for use in generating a log event
 * @param {string} level -- must be cast to uppercase before running this test
 * @returns {boolean}
 */
export function isValidLogLevel (level) {
  if (typeof level !== 'string') return false
  return Object.values(LOG_LEVELS).some(logLevel => logLevel === level.toUpperCase().trim())
}
