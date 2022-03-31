var config = require('config')
var metrics = require('metrics')

var reservedChars = [',', ';', '\\']

if (shouldObfuscate()) metrics.recordSupportability('Generic/ObfuscateUrls/Detected')
if (validateRules(getRules())) metrics.recordSupportability('Generic/ObfuscateUrls/Invalid')

function shouldObfuscate () {
  return getRules().length > 0
}

function getRules () {
  var rules = []
  var configRules = config.getConfiguration('obfuscateUrls') || []

  rules = rules.concat(configRules)

  // could add additional runtime/environment-specific rules here

  return rules
}

// takes array of rule objects, logs warning and returns false if any portion of rule is invalid
function validateRules (rules) {
  var invalidReplacementDetected = false
  var invalidRegexDetected = false

  for (var i = 0; i < rules.length; i++) {
    if (!('regex' in rules[i]) || typeof rules[i].regex !== 'string' || !(rules.regex instanceof RegExp)) {
      if (console && console.warn) console.warn('Regex: ', rules[i].regex, ' with replacement ', rules[i].replacement, 'invalid')
      invalidRegexDetected = true
    }

    var replacement = rules[i].replacement
    if (replacement) {
      for (var j = 0; j < reservedChars.length; j++) {
        var reservedChar = reservedChars[j]
        if (replacement.indexOf(reservedChar) >= 0) {
          if (console && console.warn) console.warn('An invalid character was included in an obfuscation replacement rule: "' + replacement + '". The following characters can not be used in the "replacement" string: ', reservedChars)
          invalidReplacementDetected = true
        }
      }
    }
  }

  return !invalidReplacementDetected && !invalidRegexDetected
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
function obfuscateString (string) {
    // if string is empty string, null or not a string, return unmodified
  if (!string || typeof string !== 'string') return string

  var rules = getRules()
  var obfuscated = string

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
  obfuscateString: obfuscateString,
  shouldObfuscate: shouldObfuscate,
  getRules: getRules,
  validateRules: validateRules
}
