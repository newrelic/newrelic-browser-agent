/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function dataSize (data) {
  if (typeof data === 'string' && data.length) return data.length
  if (typeof data !== 'object') return undefined
  // eslint-disable-next-line
  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer && data.byteLength) return data.byteLength
  if (typeof Blob !== 'undefined' && data instanceof Blob && data.size) return data.size
  if (typeof FormData !== 'undefined' && data instanceof FormData) return undefined

  try {
    return JSON.stringify(data).length
  } catch (e) {
    return undefined
  }
}
