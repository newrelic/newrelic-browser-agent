/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanURL } from './clean-url'

/**
 * Converts a URL to its basic form without a query string or fragment. If the resulting URL is the same as the
 * loader's origin URL, returns '<inline>'.
 * @param {string} url - The URL to be canonicalized.
 * @param {string} loaderOriginUrl - The origin URL of the agent loader, used for inline detection.
 * @returns {string} The canonicalized URL, or '<inline>' if the URL matches the loader origin URL.
 */
export function canonicalizeUrl (url, loaderOriginUrl) {
  if (typeof url !== 'string') return ''

  var cleanedUrl = cleanURL(url)

  // If the URL matches the origin URL of the loader, we assume it originated with an inline script.
  if (cleanedUrl === loaderOriginUrl) {
    return '<inline>'
  } else {
    return cleanedUrl
  }
}
