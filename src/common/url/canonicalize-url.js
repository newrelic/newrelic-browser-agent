/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { initialLocation } from '../constants/runtime'
import { cleanURL } from './clean-url'

/**
 * Converts a URL to its basic form without a query string or fragment. If the resulting URL is the same as the
 * loader's origin URL, returns '<inline>'.
 * @param {string} url - The URL to be canonicalized.
 * @param {string} loaderOriginUrl - The origin URL of the agent loader, used for inline detection.
 * @returns {string} The canonicalized URL, or '<inline>' if the URL matches the loader origin URL.
 */
export function canonicalizeUrl (url) {
  if (typeof url !== 'string') return ''

  const cleanedUrl = cleanURL(url)
  const cleanedGlobalScopeUrl = cleanURL(initialLocation)

  // If the URL matches the origin URL of the loader, we assume it originated within an inline script.
  if (cleanedUrl === cleanedGlobalScopeUrl) {
    return '<inline>'
  } else {
    return cleanedUrl
  }
}
