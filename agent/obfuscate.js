var config = require('config')
var metrics = require('metrics')

var shouldObfuscate = !!config.getConfiguration('obfuscateUrls')

var reservedChars = [',', ';', '\\']
var rules = config.getConfiguration('obfuscateUrls') || []

if (shouldObfuscate) {
  metrics.recordSupportability('Generic/ObfuscateUrls/Detected')
  var invalidReplacementDetected = false
  for (var i = 0; i < rules.length; i++) {
    var replacement = rules[i].replacement || '*'
    for (var j = 0; j < reservedChars.length; j++) {
      var reservedChar = reservedChars[j]
      if (replacement.indexOf(reservedChar) >= 0) {
        if (console && console.warn) console.warn('An invalid character was included in an obfuscation replacement rule: "' + replacement + '". The following characters can not be used in the "replacement" string: ', reservedChars)
        invalidReplacementDetected = true
      }
    }
  }
  if (invalidReplacementDetected) metrics.recordSupportability('Generic/ObfuscateUrls/Invalid')
}

// traverses an object and applies a fn to property values of a certain type
function applyFnToProps(obj, fn, type) {
  if (!obj || typeof obj !== 'object') return obj
  type = type || 'string'
  return traverse(obj)
  function traverse(obj) {
    for (var property in obj) {
      if (obj.hasOwnProperty(property)) {
        if (typeof obj[property] === 'object') {
          traverse(obj[property])
        } else {
          if (typeof obj[property] === type) obj[property] = fn(obj[property])
        }
      }
    }
    return obj
  }
}

  // applies all regex obfuscation rules to provided URL string and returns the result
function obfuscateUrl (urlString) {
    // if urlString is empty string, null or not a string, return unmodified
  if (!urlString || typeof urlString !== 'string') return urlString

  var obfuscated = urlString

    // apply every rule to URL string
  for (var i = 0; i < rules.length; i++) {
    var regex = rules[i].regex
    var replacement = rules[i].replacement || '*'
    obfuscated = obfuscated.replace(regex, replacement)
  }
  return obfuscated
}

module.exports = {
  applyFnToProps: applyFnToProps,
  obfuscateUrl: obfuscateUrl,
  shouldObfuscate: shouldObfuscate
}
