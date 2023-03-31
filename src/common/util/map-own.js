/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {function} MapOwnCallback
 * @param {string} key Object key
 * @param {any} value Object value
 * @returns {any}
 */

/**
 * Iterates the own enumerable properties of an object passing the key and value pair to a given
 * callback function.
 * @param {object} obj Input object to iterate over. If null or undefined, an empty array will be returned.
 * @param {MapOwnCallback} fn A callback function called for each property. The callback should take the key
 * and value from the object iteration and return some value.
 * @returns {any[]} An array of values returned by the callback function.
 */
export const mapOwn = (obj, fn) => Object.entries(obj || {})
  .map(([key, value]) => fn(key, value))
