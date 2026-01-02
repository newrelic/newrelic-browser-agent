/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initialLocation } from '../../../common/constants/runtime'
import { cleanURL } from '../../../common/url/clean-url'
import { LOG_LEVELS } from '../constants'

export class Log {
  /** @type {long} the unix timestamp of the log event */
  timestamp
  /** @type {string} the log message */
  message
  /** @type {object} the object of attributes to be parsed by logging ingest into top-level properties */
  attributes
  /** @type {'ERROR'|'TRACE'|'DEBUG'|'INFO'|'WARN'} the log type of the log */
  level

  /**
   * @param {number} timestamp - Unix timestamp
   * @param {string} message - message string
   * @param {object} attributes - other log event attributes
   * @param {enum} level - Log level
   */
  constructor (timestamp, message, attributes = {}, level = LOG_LEVELS.INFO) {
    /** @type {long} */
    this.timestamp = timestamp
    this.message = message
    this.attributes = { ...attributes, pageUrl: cleanURL('' + initialLocation) }
    this.level = level.toUpperCase()
  }
}
