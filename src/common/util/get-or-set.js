/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var has = Object.prototype.hasOwnProperty

/**
 * Always returns the current value of obj[prop], even if it has to set it first. Sets properties as non-enumerable if possible.
 *
 * @param {Object} obj - The object to get or set the property on.
 * @param {string} prop - The name of the property.
 * @param {Function} getVal - A function that returns the value to be set if the property does not exist.
 * @returns {*} The value of the property in the object.
 */
export function getOrSet (obj, prop, getVal) {
  // If the value exists return it.
  if (has.call(obj, prop)) return obj[prop]

  var val = getVal()

  // Attempt to set the property so it's not enumerable
  if (Object.defineProperty && Object.keys) {
    try {
      Object.defineProperty(obj, prop, {
        value: val, // old IE inherits non-write-ability
        writable: true,
        enumerable: false
      })

      return val
    } catch (e) {
      // Can't report internal errors,
      // because GOS is a dependency of the reporting mechanisms
    }
  }

  // fall back to setting normally
  obj[prop] = val
  return val
}
