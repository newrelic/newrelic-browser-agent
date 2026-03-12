/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee } from '../event-emitter/contextual-ee'

/**
 * Returns a function for use as a replacer parameter in JSON.stringify() to handle circular references.
 * Uses an array to track the current ancestor chain, allowing the same object to appear
 * multiple times in the structure as long as it's not a circular reference.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value MDN - Cyclical object value}
 * @returns {Function} A function that filters out circular references while allowing duplicate references.
 */
const getCircularReplacer = () => {
  const stack = []

  return function (key, value) {
    if (stack.length > 0) {
      // Find where we are in the stack
      const thisPos = stack.indexOf(this)
      if (~thisPos) {
        // We're still in the stack, trim it
        stack.splice(thisPos + 1)
      } else {
        // We're not in the stack, add ourselves
        stack.push(this)
      }

      // Check if value is in the current ancestor chain
      if (~stack.indexOf(value)) {
        return
      }
    } else {
      // First call, initialize with root
      stack.push(value)
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
    return JSON.stringify(val, getCircularReplacer()) ?? ''
  } catch (e) {
    try {
      ee.emit('internal-error', [e])
    } catch (err) {
      // do nothing
    }
    // return a string so that downstream users of the method do not throw errors
    return ''
  }
}
