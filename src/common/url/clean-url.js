/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var patternWithHash = /([^?#]*)[^#]*(#[^?]*|$).*/
var patternWithoutHash = /([^?#]*)().*/

/**
 * Cleans a URL by removing the query string and fragment (hash portion).
 * @param {string} url - The original URL to be cleaned.
 * @param {boolean} [keepHash=false] - Whether to preserve the hash portion of the URL.
 * @returns {string} The cleaned URL.
 */
export function cleanURL (url, keepHash) {
  return url.replace(keepHash ? patternWithHash : patternWithoutHash, '$1$2')
}
