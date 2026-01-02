/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Applies a function to properties of a specified type in an object, recursively.
 *
 * @param {Object} obj - The object to apply the function to.
 * @param {Function} fn - The function to apply to matching properties.
 * @param {string} [type='string'] - The type of properties to apply the function to.
 * @param {Array<string>} [ignoreKeys=[]] - The keys of properties to ignore and not modify.
 * @returns {Object} - The object with function recursively applied.
 */
export function applyFnToProps (obj, fn, type = 'string', ignoreKeys = []) {
  if (!obj || typeof obj !== 'object') return obj

  Object.keys(obj).forEach(property => {
    if (typeof obj[property] === 'object') {
      applyFnToProps(obj[property], fn, type, ignoreKeys)
    } else {
      // eslint-disable-next-line valid-typeof
      if (typeof obj[property] === type && !ignoreKeys.includes(property)) obj[property] = fn(obj[property])
    }
  })

  return obj
}
