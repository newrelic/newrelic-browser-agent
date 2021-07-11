
module.exports = {
  shouldCollectEvent: shouldCollectEvent,
  setDenyList: setDenyList
}

var denyList = []

function shouldCollectEvent(params) {
  if (denyList.length === 0) {
    return true
  }

  for (var i = 0; i < denyList.length; i++) {
    var parsed = denyList[i]
    if (parsed.hostname === '*') {
      return false
    }
    if (compareDomain(parsed.hostname, params.hostname) &&
        comparePath(parsed.pathname, params.pathname)) {
      return false
    }
  }
  return true
}

function setDenyList(denyListConfig) {
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

function compareDomain(pattern, domain) {
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
