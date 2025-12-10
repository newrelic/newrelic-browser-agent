/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

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
 * Determines if a content-type header represents human-readable content.
 * @param {string} contentType - The content-type header value
 * @returns {boolean} True if the content type is human-readable (text-based)
 */
export function isHumanReadableContentType (contentType) {
  if (!contentType) return false
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
