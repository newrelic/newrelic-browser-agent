/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../util/global-scope';

var stringsToParsedUrls = {}

export function parseUrl(url) {
  if (url in stringsToParsedUrls) {
    return stringsToParsedUrls[url]
  }

  // Return if URL is a data URL, parseUrl assumes urls are http/https
  if ((url || '').indexOf('data:') === 0) {
    return {
      protocol: 'data'
    }
  }

  let urlEl;
  var location = globalScope?.location
  var ret = {}

  if (isBrowserScope) {
    // Use an anchor dom element to resolve the url natively.
    urlEl = document.createElement('a')
    urlEl.href = url
  }
  else {
    try {
      urlEl = new URL(url, location.href)
    } catch (err) {
      return ret
    }
  }

  ret.port = urlEl.port

  var firstSplit = urlEl.href.split('://')

  if (!ret.port && firstSplit[1]) {
    ret.port = firstSplit[1].split('/')[0].split('@').pop().split(':')[1]
  }
  if (!ret.port || ret.port === '0') ret.port = (firstSplit[0] === 'https' ? '443' : '80')

  // Host not provided in IE for relative urls
  ret.hostname = (urlEl.hostname || location.hostname)

  ret.pathname = urlEl.pathname

  ret.protocol = firstSplit[0]

  // Pathname sometimes doesn't have leading slash (IE 8 and 9)
  if (ret.pathname.charAt(0) !== '/') ret.pathname = '/' + ret.pathname

  // urlEl.protocol is ':' in old ie when protocol is not specified
  var sameProtocol = !urlEl.protocol || urlEl.protocol === ':' || urlEl.protocol === location.protocol
  var sameDomain = urlEl.hostname === location.hostname && urlEl.port === location.port

  // urlEl.hostname is not provided by IE for relative urls, but relative urls are also same-origin
  ret.sameOrigin = sameProtocol && (!urlEl.hostname || sameDomain)

  // Only cache if url doesn't have a path
  if (ret.pathname === '/') {
    stringsToParsedUrls[url] = ret
  }

  return ret
}
