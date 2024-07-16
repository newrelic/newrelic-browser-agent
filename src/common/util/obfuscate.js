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
      warn(12)
      invalidRegexDetected = true
    } else if (typeof rules[i].regex !== 'string' && !(rules[i].regex instanceof RegExp)) {
      warn(13)
      invalidRegexDetected = true
    }

    var replacement = rules[i].replacement
    if (replacement && typeof replacement !== 'string') {
      warn(14)
      invalidReplacementDetected = true
    }
  }

  return !invalidReplacementDetected && !invalidRegexDetected
}
