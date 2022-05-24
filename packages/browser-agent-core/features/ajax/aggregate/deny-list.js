
// export default {
//   shouldCollectEvent: shouldCollectEvent,
//   setDenyList: setDenyList
// }

var denyList = []

export function shouldCollectEvent(params) {
  if (denyList.length === 0) {
    return true
  }

  for (var i = 0; i < denyList.length; i++) {
    var parsed = denyList[i]
    if (parsed.hostname === '*') {
      return false
    }
    if (domainMatchesPattern(parsed.hostname, params.hostname) &&
        comparePath(parsed.pathname, params.pathname)) {
      return false
    }
  }
  return true
}

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

// returns true if the right side of the domain matches the pattern
function domainMatchesPattern(pattern, domain) {
  if (pattern.length > domain.length) {
    return false
  }

  if (domain.indexOf(pattern) === (domain.length - pattern.length)) {
    return true
  }
  return false
}

function comparePath(pattern, path) {
  if (pattern.indexOf('/') === 0) {
    pattern = pattern.substring(1)
  }

  if (path.indexOf('/') === 0) {
    path = path.substring(1)
  }

  // no path in pattern means match all paths
  if (pattern === '') {
    return true
  }

  if (pattern === path) {
    return true
  }

  return false
}
