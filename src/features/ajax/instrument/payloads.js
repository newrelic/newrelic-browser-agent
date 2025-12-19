/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { stringify } from '../../../common/util/stringify'

/**
 * Parses a query string into an object of key-value pairs.
 * @param {string} search a query string starting with "?" or without (ex. new URL(...).search)
 * @returns {Object|undefined} Parsed query parameters as key-value pairs. Returns undefined if no valid parameters are found.
 */
export function parseQueryString (search) {
  if (!search || search.length === 0) return

  const queryParams = {}
  try {
    const searchParams = new URLSearchParams(search)
    searchParams.forEach(function (value, key) {
      queryParams[key] = value
    })
  } catch (e) {
    // Fallback for environments without URLSearchParams
  }

  return queryParams
}

/**
 * Determines if the given content type is likely to be human-readable (text-based).
 * @param {string} contentType - The content-type header value
 * @returns {boolean} True if the content type is human-readable (text-based)
 */
export function isLikelyHumanReadable (headers, data) {
  if (!headers) return typeof data === 'string'
  var contentType = headers['content-type']
  if (!contentType) return typeof data === 'string'
  // Normalize to lowercase and extract the mime type (ignore charset, etc.)
  var mimeType = contentType.toLowerCase().split(';')[0].trim()

  // Check for text/* types
  if (mimeType.indexOf('text/') === 0) return true

  // Check for specific application/* types
  var readableAppTypes = [
    '/json',
    '/xml',
    '/xhtml+xml',
    '/ld+json',
    '/yaml',
    '/x-www-form-urlencoded'
  ]

  for (var i = 0; i < readableAppTypes.length; i++) {
    if (mimeType === 'application' + readableAppTypes[i]) return true
  }

  return false
}

/**
 * Truncates a string to ensure its UTF-8 byte length does not exceed 4092 bytes.  If truncation is necessary,
 * the string is cut off at a character boundary to avoid breaking multi-byte characters and " ..." is appended to indicate truncation.
 * If not a string, it is first converted to a string using JSON.stringify.
 * @param {*} data The data to truncate.
 * @returns {string}
 */
export function truncateAsString (data) {
  if (!data) return data
  try {
    if (typeof data !== 'string') data = stringify(data)
    let bytes = 0
    let i = 0
    let needsEllipsis = false

    while (i < data.length) {
      const c = data.charCodeAt(i)
      const charBytes = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0xD800 || c >= 0xE000 ? 3 : 4

      if (bytes + charBytes > 4092) {
        needsEllipsis = true
        break
      }

      bytes += charBytes
      i += charBytes === 4 ? 2 : 1
    }

    return data.slice(0, i) + (needsEllipsis ? ' ...' : '')
  } catch (e) {
    return data
  }
}
