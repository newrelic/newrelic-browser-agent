/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope } from '../constants/runtime'

const uuidv4Template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'

/**
 * Creates a random single hexadecimal value from a provided random value
 * table and corresponding index. If a random value table is not provided,
 * Math.random will be used to generate the value.
 *
 * @param {Uint8Array} valueTable Random value table typically generated using
 * the built-in crypto engine.
 * @param {int} tableIndex The index of the value table to use for generating
 * the hexadecimal value.
 * @returns {int} single hexadecimal value in decimal format
 */
function getRandomValue (valueTable, tableIndex) {
  if (valueTable) {
    /**
     * The value table could have any number value in the given index. Use
     * bitwise AND to ensure the value we generate is a valid hex value.
     * x & 15 will ensure the value converted to hex using `toString(16)`
     * falls within the range of 0 and 15 inclusively.
     */
    return valueTable[tableIndex] & 15
  } else {
    return Math.random() * 16 | 0
  }
}

/**
 * Generates a RFC compliant UUIDv4 using native browser crypto engine. If the browser
 * does not support the crypto engine, the function will fallback to insecure Math.random()
 * @returns {string} uuid version 4 string
 */
export function generateUuid () {
  const crypto = globalScope?.crypto || globalScope?.msCrypto

  let randomValueTable
  let randomValueIndex = 0
  if (crypto && crypto.getRandomValues) {
    // For a UUID, we only need 30 characters since two characters are pre-defined
    // eslint-disable-next-line
    randomValueTable = crypto.getRandomValues(new Uint8Array(30))
  }

  return uuidv4Template.split('').map(templateInput => {
    if (templateInput === 'x') {
      return getRandomValue(randomValueTable, randomValueIndex++).toString(16)
    } else if (templateInput === 'y') {
      // this is the uuid variant per spec (8, 9, a, b)
      // % 4, then shift to get values 8-11
      return (getRandomValue() & 0x3 | 0x8).toString(16)
    } else {
      return templateInput
    }
  }).join('')
}

/**
 * Generates a string of the given length containing only hexadecimal
 * value 0-9 and a-f.
 * @param {int} length length of the string to generate
 * @returns {string} generated hex string
 */
export function generateRandomHexString (length) {
  const crypto = globalScope?.crypto || globalScope?.msCrypto

  let randomValueTable
  let randomValueIndex = 0
  if (crypto && crypto.getRandomValues) {
    // eslint-disable-next-line
    randomValueTable = crypto.getRandomValues(new Uint8Array(length))
  }

  const chars = []
  for (var i = 0; i < length; i++) {
    chars.push(getRandomValue(randomValueTable, randomValueIndex++).toString(16))
  }
  return chars.join('')
}

/**
 * Generates a 16 character length hexadecimal string.
 * per DT-spec.
 * @see generateRandomHexString
 * @returns {string} generated hex string
 */
export function generateSpanId () {
  return generateRandomHexString(16)
}

/**
 * Generates a 32 character length hexadecimal string.
 * per DT-spec.
 * @see generateRandomHexString
 * @returns {string} generated hex string
 */
export function generateTraceId () {
  return generateRandomHexString(32)
}
