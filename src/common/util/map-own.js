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
 * @param {object} obj Input object to iterate
 * @param {MapOwnCallback} fn Callback function called for each property and passed the property key and value
 * @returns {any[]}
 */
export const mapOwn = (obj, fn) => Object.entries(obj)
  .map(([key, value]) => fn(key, value))
