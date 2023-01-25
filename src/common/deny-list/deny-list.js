/** An array of filter objects {hostname, pathname} for identifying XHR events to be excluded from collection.
 * @see {@link https://docs.newrelic.com/docs/browser/new-relic-browser/configuration/filter-ajax-request-events/ Filter AjaxRequest events}
 * @type {Array.<{hostname: string, pathname: string}>}
 */
var denyList = []

/**
 * Evaluates whether an XHR event should be included for collection based on the {@link denyList|AjaxRequest deny list}.
 * @param {Object} params - object with properties of the XHR event
 * @returns {boolean} `true` if request does not match any entries of {@link denyList|deny list}; else `false`
 */
export function shouldCollectEvent(params) {
  if (denyList.length === 0) {
    return true
  }
  
  // XHR requests with an undefined hostname (e.g., data URLs) should not be collected.
  if (params.hostname === undefined) {
    return false
  }

  for (var i = 0; i < denyList.length; i++) {
    var parsed = denyList[i]

    if (parsed.hostname === '*') {
      return false
    }
    
    if (domainMatchesPattern(parsed.hostname, params.hostname)
      && comparePath(parsed.pathname, params.pathname)) {
      return false
    }
  }

  return true
}

/**
 * Initializes the {@link denyList|XHR deny list} by extracting hostname and pathname from an array of filter strings.
 * @param {string[]} denyListConfig - array of URL filters to identify XHR requests to be excluded from collection
 */
export function setDenyList(denyListConfig) {
  denyList = []

  if (!denyListConfig || !denyListConfig.length) {
    return
  }

  for (var i = 0; i < denyListConfig.length; i++) {
    var url = denyListConfig[i]

    if (url.indexOf('http://') === 0) {
      url = url.substring(7)
    } else if (url.indexOf('https://') === 0) {
      url = url.substring(8)
    }

    var firstSlash = url.indexOf('/')

    if (firstSlash > 0) {
      denyList.push({
        hostname: url.substring(0, firstSlash),
        pathname: url.substring(firstSlash)
      })
    } else {
      denyList.push({
        hostname: url,
        pathname: ''
      })
    }
  }
}
/**
 * Returns true if the right side of `domain` (end of string) matches `pattern`.
 * @param {string} pattern - a string to be matched against the end of `domain` string
 * @param {string} domain - a domain string with no protocol or path (e.g., app1.example.com)
 * @returns {boolean} `true` if domain matches pattern; else `false`
 */
function domainMatchesPattern(pattern, domain) {
  if (pattern.length > domain.length) {
    return false
  }

  if (domain.indexOf(pattern) === (domain.length - pattern.length)) {
    return true
  }

  return false
}

/**
 * Returns true if a URL path matches a pattern string, disregarding leading slashes.
 * @param {string} pattern - a string to compare with path (e.g., api/v1)
 * @param {string} path - a string representing a URL path (e.g., /api/v1)
 * @returns {boolean} `true` if path and pattern are an exact string match (except for leading slashes); else `false`
 */
function comparePath(pattern, path) {
  if (pattern.indexOf('/') === 0) {
    pattern = pattern.substring(1)
  }

  if (path.indexOf('/') === 0) {
    path = path.substring(1)
  }

  // No path in pattern means match all paths.
  if (pattern === '') {
    return true
  }

  if (pattern === path) {
    return true
  }

  return false
}
