var config = require('config')
var metrics = require('metrics')
var protocol = require('./protocol')

var fileProtocolRule = {
  regex: /^file:\/\/(.*)/,
  replacement: 'file://OBFUSCATED'
}

if (shouldObfuscate()) metrics.recordSupportability('Generic/Obfuscate/Detected')
if (shouldObfuscate() && !validateRules(getRules())) metrics.recordSupportability('Generic/Obfuscate/Invalid')

function shouldObfuscate () {
  return getRules().length > 0
}

function getRules () {
  var rules = []
  var configRules = config.getConfiguration('obfuscate') || []

  rules = rules.concat(configRules)

  if (protocol.isFileProtocol()) rules.push(fileProtocolRule)
  // could add additional runtime/environment-specific rules here

  return rules
}

// takes array of rule objects, logs warning and returns false if any portion of rule is invalid
function validateRules (rules) {
  var invalidReplacementDetected = false
  var invalidRegexDetected = false
  for (var i = 0; i < rules.length; i++) {
    if (!('regex' in rules[i])) {
      if (console && console.warn) console.warn('An obfuscation replacement rule was detected missing a "regex" value.')
      invalidRegexDetected = true
    } else if (typeof rules[i].regex !== 'string' && !(rules[i].regex.constructor === RegExp)) {
      if (console && console.warn) console.warn('An obfuscation replacement rule contains a "regex" value with an invalid type (must be a string or RegExp)')
      invalidRegexDetected = true
    }

    var replacement = rules[i].replacement
    if (replacement) {
      if (typeof replacement !== 'string') {
        if (console && console.warn) console.warn('An obfuscation replacement rule contains a "replacement" value with an invalid type (must be a string)')
        invalidReplacementDetected = true
      }
    }
  }

  return !invalidReplacementDetected && !invalidRegexDetected
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
  obfuscateString: obfuscateString,
  shouldObfuscate: shouldObfuscate,
  getRules: getRules,
  validateRules: validateRules
}
