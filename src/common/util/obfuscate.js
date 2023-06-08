import { getConfigurationValue } from '../config/config'
import { SharedContext } from '../context/shared-context'
import { isFileProtocol } from '../url/protocol'
import { warn } from './console'

var fileProtocolRule = {
  regex: /^file:\/\/(.*)/,
  replacement: atob('ZmlsZTovL09CRlVTQ0FURUQ=')
}
export class Obfuscator extends SharedContext {
  shouldObfuscate () {
    return getRules(this.sharedContext.agentIdentifier).length > 0
  }

  // applies all regex obfuscation rules to provided URL string and returns the result
  obfuscateString (string) {
    // if string is empty string, null or not a string, return unmodified
    if (!string || typeof string !== 'string') return string

    var rules = getRules(this.sharedContext.agentIdentifier)
    var obfuscated = string

    // apply every rule to URL string
    for (var i = 0; i < rules.length; i++) {
      var regex = rules[i].regex
      var replacement = rules[i].replacement || '*'
      obfuscated = obfuscated.replace(regex, replacement)
    }
    return obfuscated
  }
}

// TO DO: this function should be inside the Obfuscator class since its context relates to agentID
export function getRules (agentIdentifier) {
  var rules = []
  var configRules = getConfigurationValue(agentIdentifier, 'obfuscate') || []

  rules = rules.concat(configRules)

  if (isFileProtocol()) rules.push(fileProtocolRule)
  // could add additional runtime/environment-specific rules here

  return rules
}

// takes array of rule objects, logs warning and returns false if any portion of rule is invalid
export function validateRules (rules) {
  var invalidReplacementDetected = false
  var invalidRegexDetected = false
  for (var i = 0; i < rules.length; i++) {
    if (!('regex' in rules[i])) {
      warn('An obfuscation replacement rule was detected missing a "regex" value.')
      invalidRegexDetected = true
    } else if (typeof rules[i].regex !== 'string' && !(rules[i].regex instanceof RegExp)) {
      warn('An obfuscation replacement rule contains a "regex" value with an invalid type (must be a string or RegExp)')
      invalidRegexDetected = true
    }

    var replacement = rules[i].replacement
    if (replacement) {
      if (typeof replacement !== 'string') {
        warn('An obfuscation replacement rule contains a "replacement" value with an invalid type (must be a string)')
        invalidReplacementDetected = true
      }
    }
  }

  return !invalidReplacementDetected && !invalidRegexDetected
}
