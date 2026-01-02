/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Reduce the invocation of the supplied function so that it is only invoked
 * once within a given timeout.
 *
 * If `wait` is `0`, the function will be invoked during the next tick.
 * If `options.leading` is false or not provided, the function will be invoked
 * N milliseconds after the last invocation of the returned function where
 * N is the `timeout` value.
 * If `options.leading` is true, the function will be invoked immediately upon
 * the first invocation of the returned function and not again for N milliseconds
 * where N is the `timeout` value.
 * @param {function} func Function whose invocation should be limited so it is only invoked
 * once within a given timeout period.
 * @param {number} timeout Time in milliseconds that the function should only be invoked
 * once within.
 * @param {object} options Debounce options
 * @param {boolean} options.leading Forces the function to be invoked on the first
 * invocation of the returned function instead of N milliseconds after the last
 * invocation.
 * @returns {function} A wrapping function that will ensure the provided function
 * is invoked only once within the given timeout.
 */
export function debounce (func, timeout = 500, options = {}) {
  const leading = options?.leading || false
  let timer
  return (...args) => {
    if (leading && timer === undefined) {
      func.apply(this, args)
      timer = setTimeout(() => { timer = clearTimeout(timer) }, timeout)
    }

    if (!leading) {
      clearTimeout(timer)
      timer = setTimeout(() => { func.apply(this, args) }, timeout)
    }
  }
}

/**
 * Reduce the invocation of the supplied function so that it is only invoked
 * once.
 * @param {function} func Function whose invocation should be limited so it is only invoked
 * once.
 * @returns {function} A wrapping function that will ensure the provided function
 * is invoked only once.
 */
export function single (func) {
  let called = false
  return (...args) => {
    if (!called) {
      called = true
      func.apply(this, args)
    }
  }
}
