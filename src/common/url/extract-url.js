/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../constants/runtime'
import { gosNREUMOriginals } from '../window/nreum'

/**
 * Extracts a URL from various target types.
 * @param {string|Request|URL} target - The target to extract the URL from. It can be a string, a Fetch Request object, or a URL object.
 * @returns {string|undefined} The extracted URL as a string, or undefined if the target type is not supported.
 */
export function extractUrl (target) {
  if (typeof target === 'string') return target
  else if (target instanceof gosNREUMOriginals().o.REQ) return target.url
  else if (globalScope?.URL && target instanceof URL) return target.href
}
