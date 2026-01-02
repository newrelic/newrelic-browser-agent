/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope } from '../constants/runtime'

export function parseUrl (url) {
  // Return if URL is a data URL, parseUrl assumes urls are http/https
  if ((url || '').indexOf('data:') === 0) {
    return {
      protocol: 'data'
    }
  }

  try {
    const parsedUrl = new URL(url, location.href)
    const returnVal = {
      port: parsedUrl.port,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      protocol: parsedUrl.protocol.slice(0, parsedUrl.protocol.indexOf(':')),
      sameOrigin: parsedUrl.protocol === globalScope?.location?.protocol && parsedUrl.host === globalScope?.location?.host
    }

    if (!returnVal.port || returnVal.port === '') {
      if (parsedUrl.protocol === 'http:') returnVal.port = '80'
      if (parsedUrl.protocol === 'https:') returnVal.port = '443'
    }

    if (!returnVal.pathname || returnVal.pathname === '') {
      returnVal.pathname = '/'
    } else if (!returnVal.pathname.startsWith('/')) {
      returnVal.pathname = `/${returnVal.pathname}`
    }

    return returnVal
  } catch (err) {
    return {}
  }
}
