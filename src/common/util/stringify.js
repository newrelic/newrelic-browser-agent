/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee } from '../event-emitter/contextual-ee'

const getCircularReplacer = () => {
  const seen = new WeakSet()
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return
      }
      seen.add(value)
    }
    return value
  }
}

/**
 * The native JSON.stringify method augmented with a replacer function to handle circular references.
 * Circular references will be excluded from the JSON output rather than triggering errors.
 * @param {*} val - A value to be converted to a JSON string.
 * @returns {string} A JSON string representation of the value, with circular references handled.
 */
export function stringify (val) {
  try {
    return JSON.stringify(val, getCircularReplacer())
  } catch (e) {
    try {
      ee.emit('internal-error', [e])
    } catch (err) {
      // do nothing
    }
  }
}
