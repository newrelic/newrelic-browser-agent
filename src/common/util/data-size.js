/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { stringify } from './stringify'

/**
 * Returns the size of the provided data. Designed for measuring XHR responses.
 *
 * @param {*} data - The data to be measured.
 * @returns {(number|undefined)} - The size of the data or undefined if size cannot be determined.
 */
export function dataSize (data) {
  if (typeof data === 'string' && data.length) return data.length
  if (typeof data !== 'object') return undefined
  // eslint-disable-next-line
  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer && data.byteLength) return data.byteLength
  if (typeof Blob !== 'undefined' && data instanceof Blob && data.size) return data.size
  if (typeof FormData !== 'undefined' && data instanceof FormData) return undefined

  try {
    return stringify(data).length
  } catch (e) {
    return undefined
  }
}
