/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates a hash value for a given string.
 *
 * @param {string} s - The string to calculate the hash value for.
 * @returns {number} - The calculated hash value.
 * @throws {Error} - If the input is null or undefined.
 */
export function sHash (s) {
  var i
  var h = 0

  for (i = 0; i < s.length; i++) {
    h += ((i + 1) * s.charCodeAt(i))
  }
  return Math.abs(h)
}
