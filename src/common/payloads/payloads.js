/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { stringify } from '../util/stringify'
import { CAPTURE_PAYLOAD_SETTINGS } from '../../features/ajax/constants'

/**
 * Determines whether payload data should be captured based on the capture mode setting,
 * HTTP status code, and GraphQL error status.  Will never capture agent's own payloads.
 * @param {string} captureMode - The capture mode setting ('none', 'all', or 'failures')
 * @param {Object} event - An object representing the AJAX event
 * @param {number} event.statusCode - The HTTP status code
 * @param {boolean} event.hasGQLErrors - Whether the response contains GraphQL errors
 * @param {string} event.payloadHost - The host of the AJAX payload (includes port)
 * @param {string} event.payloadHostname - The hostname of the AJAX payload
 * @param {string} [event.payloadPathname=''] - The pathname of the AJAX payload
 * @param {string[]} [beacons=[]] - Array of beacon hostnames to avoid capturing
 * @returns {boolean} True if payload should be captured
 */
export function canCapturePayload (captureMode, {
  statusCode,
  hasGQLErrors,
  payloadHost,
  payloadHostname,
  payloadPathname = ''
}, beacons = []) {
  if (payloadHostname) {
    const payloadUrl = payloadHostname + payloadPathname
    const payloadUrlWithPort = payloadHost + payloadPathname
    if (beacons.some((b) => {
      return b === payloadUrl || payloadUrl.startsWith(b + '/') || b === payloadUrlWithPort || payloadUrlWithPort.startsWith(b + '/')
    })) return false
  }
  if (captureMode === CAPTURE_PAYLOAD_SETTINGS.ALL) return true
  if (!captureMode || captureMode === CAPTURE_PAYLOAD_SETTINGS.NONE) return false

  // Default "failures" mode
  return statusCode === 0 || statusCode >= 400 || hasGQLErrors === true
}

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
 * @param {Object} headers - The headers object containing content-type
 * @param {*} data - The data to check
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

/**
 * Creates string adder functions for BEL serialization with obfuscation and optional truncation, as well as raw string.
 * This ensures a single string table is used while providing separate handling for regular vs payload attributes.
 * @param {Function} getAddStringContext - Function that creates a new string table context
 * @param {Object} obfuscator - Optional obfuscator instance for string obfuscation
 * @returns {{addString: Function, addStringRaw: Function, addStringWithTruncation: Function}} Object containing various string adder functions
 */
export function createStringAdders (getAddStringContext, obfuscator) {
  const addStringRaw = getAddStringContext()

  const processString = (str, shouldTruncate) => {
    if (typeof str === 'undefined' || str === '') return addStringRaw(str)
    if (typeof str !== 'string') str = stringify(str)
    const obfuscated = obfuscator?.obfuscateString(str) ?? str
    const processed = shouldTruncate ? truncateAsString(obfuscated) : obfuscated
    return addStringRaw(processed)
  }

  return {
    addString: (str) => processString(str, false),
    addStringRaw: (str) => addStringRaw(str),
    addStringWithTruncation: (str) => processString(str, true)
  }
}
