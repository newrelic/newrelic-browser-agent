/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An array of filter objects {hostname, pathname} for identifying XHR events to be excluded from collection.
 * @see {@link https://docs.newrelic.com/docs/browser/new-relic-browser/configuration/filter-ajax-request-events/ Filter AjaxRequest events}
 * @type {Array.<{hostname: string, pathname: string}>}
 */
var denyList = []

/**
 * Evaluates whether an XHR event should be included for collection based on the {@link denyList|AjaxRequest deny list}.
 * @param {Object} params - object with properties of the XHR event
 * @returns {boolean} `true` if request does not match any entries of {@link denyList|deny list}; else `false`
 */
export function shouldCollectEvent (params) {
  if (!params || hasUndefinedHostname(params)) return false

  if (denyList.length === 0) return true

  // short circuit if deny list contains just a wildcard
  if (denyList[0].hostname === '*') return false

  for (var i = 0; i < denyList.length; i++) {
    var parsed = denyList[i]

    if (parsed.hostname.test(params.hostname) &&
      parsed.pathname.test(params.pathname)) {
      return false
    }
  }

  return true
}

export function hasUndefinedHostname (params) {
  return (params.hostname === undefined) // requests with an undefined hostname (e.g., data URLs) should not be collected.
}

/**
 * Initializes the {@link denyList|XHR deny list} by extracting hostname and pathname from an array of filter strings.
 * @param {string[]} denyListConfig - array of URL filters to identify XHR requests to be excluded from collection
 */
export function setDenyList (denyListConfig) {
  denyList = []

  if (!denyListConfig || !denyListConfig.length) {
    return
  }

  for (var i = 0; i < denyListConfig.length; i++) {
    let url = denyListConfig[i]
    if (!url) continue // ignore bad values like undefined or empty strings

    // short circuit if deny list entry is just a wildcard
    if (url === '*') {
      denyList = [{ hostname: '*' }]
      return
    }

    if (url.indexOf('http://') === 0) {
      url = url.substring(7)
    } else if (url.indexOf('https://') === 0) {
      url = url.substring(8)
    }

    const firstSlash = url.indexOf('/')
    let host, pathname
    if (firstSlash > 0) {
      host = url.substring(0, firstSlash)
      pathname = url.substring(firstSlash)
    } else {
      host = url
      pathname = '*'
    }
    let [hostname] = host.split(':')

    denyList.push({
      hostname: convertToRegularExpression(hostname),
      pathname: convertToRegularExpression(pathname, true)
    })
  }
}

/**
 * Converts a deny list filter string into a regular expression object with wildcard support
 * @param {string} filter - deny list filter to convert
 * @param {boolean} [isPathname=false] - indicates if the filter is a pathname
 * @returns {RegExp} - regular expression object built from the input string
 */
function convertToRegularExpression (filter, isPathname = false) {
  const newFilter = filter
    .replace(/[.+?^${}()|[\]\\]/g, (m) => '\\' + m) // use a replacer function to not break apm injection
    .replace(/\*/g, '.*?') // use lazy matching instead of greedy
  return new RegExp((isPathname ? '^' : '') + newFilter + '$')
}
