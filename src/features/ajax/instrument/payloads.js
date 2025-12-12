/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { stringify } from '../../../common/util/stringify'

/**
 * Parses a query string into an object of key-value pairs.
 * @param {string} search a query string starting with "?" or without (ex. new URL(...).search)
 * @returns {Object} Parsed query parameters as key-value pairs. Returns an empty object if no valid parameters are found.
 */
export function parseQueryString (search) {
  const queryParams = {}
  if (!search || search.length === 0) return queryParams

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
 * Parses raw response headers string into an object.
 * @param {string} headerStr
 * @returns {Object} Parsed headers as key-value pairs
 */
export function parseResponseHeaders (headerStr) {
  const headers = {}
  if (!headerStr) return headers

  headerStr.split('\r\n').forEach(function (line) {
    const separatorIndex = line.indexOf(': ')
    if (separatorIndex > 0) {
      const name = line.substring(0, separatorIndex)
      const value = line.substring(separatorIndex + 2)
      headers[name] = value
    }
  })

  return headers
}

/**
 * Determines if the given content type is likely to be human-readable (text-based).
 * @param {string} contentType - The content-type header value
 * @returns {boolean} True if the content type is human-readable (text-based)
 */
export function isLikelyHumanReadable (contentType, data) {
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
 * MUTATES the params object to clear out payload data
 * @param {Object} params The ajax params object
 */
export function clearPayloads (params) {
  params.requestBody = undefined
  params.requestHeaders = undefined
  params.requestQuery = undefined
  params.responseBody = undefined
  params.responseHeaders = undefined
}

/**
 * MUTATES the params object to truncate payload data if it exists
 * @param {Object} params The ajax params object
 */
export function truncatePayloads (params) {
  params.requestBody = truncateAjaxPayloadString(params.requestBody)
  params.requestHeaders = truncateAjaxPayloadString(params.requestHeaders)
  params.requestQuery = truncateAjaxPayloadString(params.requestQuery)
  params.responseBody = truncateAjaxPayloadString(params.responseBody)
  params.responseHeaders = truncateAjaxPayloadString(params.responseHeaders)
}

/**
 * Truncates a string to ensure its UTF-8 byte length does not exceed 4092 bytes.  If truncation is necessary,
 * the string is cut off at a character boundary to avoid breaking multi-byte characters and " ..." is appended to indicate truncation.
 * @param {string} str The string to truncate.
 * @returns {string}
 */
export function truncateAjaxPayloadString (str) {
  if (!str) return str
  try {
    if (typeof str !== 'string') str = stringify(str)
    let bytes = 0
    let i = 0
    let needsEllipsis = false

    while (i < str.length) {
      const c = str.charCodeAt(i)
      const charBytes = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0xD800 || c >= 0xE000 ? 3 : 4

      if (bytes + charBytes > 4092) {
        needsEllipsis = true
        break
      }

      bytes += charBytes
      i += charBytes === 4 ? 2 : 1
    }

    return str.slice(0, i) + (needsEllipsis ? ' ...' : '')
  } catch (e) {
    return str
  }
}
