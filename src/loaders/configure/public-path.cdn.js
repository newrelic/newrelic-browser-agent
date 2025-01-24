/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/** Set the default CDN or remote for fetching the assets; NPM shouldn't change this var */
export const redefinePublicPath = (urlString) => {
  const isOrigin = urlString.startsWith('http')
  // Input is not expected to end in a slash, but webpack concats as-is, so one is inserted.
  urlString += '/'
  // If there's no existing HTTP scheme, the secure protocol is prepended by default.
  __webpack_public_path__ = isOrigin ? urlString : 'https://' + urlString // eslint-disable-line
}
