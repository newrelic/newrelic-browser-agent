/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from './console'

const checked = new Map()

/**
 * Checks if the provided functions are native functions.
 * @param {...Function} fns - An array of functions to check if they are native.
 * @returns {boolean} true if all the expected globals are native, false otherwise
 */
export function isNative (...fns) {
  return fns.every(fn => {
    if (checked.has(fn)) return checked.get(fn)
    const isNative = typeof fn === 'function' && fn.toString().includes('[native code]')
    if (!isNative) {
      warn(63, fn?.name || fn?.toString())
    }
    checked.set(fn, isNative)
    return isNative
  })
}
