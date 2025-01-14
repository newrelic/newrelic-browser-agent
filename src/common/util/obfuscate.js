import { isFileProtocol } from '../url/protocol'
import { warn } from './console'

/**
 * Represents an obfuscation rule that can be applied to harvested payloads
 * @typedef {object} ObfuscationRule
 * @property {string|RegExp} regex The regular expression to match against in the payload
 * @property {string} [replacement] The string to replace the matched regex with
 */

/**
 * Represents an obfuscation rule validation state
 * @typedef {object} ObfuscationRuleValidation
 * @property {ObfuscationRule} rule The original rule validated
 * @property {boolean} isValid Whether the rule is valid
 * @property {object} errors Validation errors
 * @property {boolean} errors.regexMissingDetected Whether the regex is missing
 * @property {boolean} errors.invalidRegexDetected Whether the regex is invalid
 * @property {boolean} errors.invalidReplacementDetected Whether the replacement is invalid
 */

export class Obfuscator {
  constructor (agentRef) {
    this.agentRef = agentRef
    this.warnedRegexMissing = false
    this.warnedInvalidRegex = false
    this.warnedInvalidReplacement = false
  }

  get obfuscateConfigRules () {
    return this.agentRef.init.obfuscate || []
  }

  /**
   * Applies all valid obfuscation rules to the provided input string
   * @param {string} input String to obfuscate
   * @returns {string}
   */
  obfuscateString (input) {
    // if input is not of type string or is an empty string, short-circuit
    if (typeof input !== 'string' || input.trim().length === 0) return input

    const rules = (this.obfuscateConfigRules).map(rule => Obfuscator.validateObfuscationRule(rule))
    if (isFileProtocol()) {
      rules.push({
        regex: /^file:\/\/(.*)/,
        replacement: atob('ZmlsZTovL09CRlVTQ0FURUQ=')
      })
    }

    return rules
      .filter(ruleValidation => ruleValidation.isValid)
      .reduce((input, ruleValidation) => {
        const { rule } = ruleValidation
        return input.replace(rule.regex, rule.replacement || '*')
      }, input)
  }

  /**
   * Validates an obfuscation rule and provides errors if any are found.
   * @param {ObfuscationRule} rule The rule to validate
   * @returns {ObfuscationRuleValidation} The validation state of the rule
   */
  static validateObfuscationRule (rule) {
    const regexMissingDetected = Boolean(rule.regex === undefined)
    const invalidRegexDetected = Boolean(rule.regex !== undefined && typeof rule.regex !== 'string' && !(rule.regex instanceof RegExp))
    const invalidReplacementDetected = Boolean(rule.replacement && typeof rule.replacement !== 'string')

    if (regexMissingDetected && !this.warnedRegexMissing) {
      warn(12, rule)
      this.warnedRegexMissing = true
    } else if (invalidRegexDetected && !this.warnedInvalidRegex) {
      warn(13, rule)
      this.warnedInvalidRegex = true
    }
    if (invalidReplacementDetected && !this.warnedInvalidReplacement) {
      warn(14, rule)
      this.warnedInvalidReplacement = true
    }

    return {
      rule,
      isValid: !regexMissingDetected && !invalidRegexDetected && !invalidReplacementDetected,
      errors: {
        regexMissingDetected,
        invalidRegexDetected,
        invalidReplacementDetected
      }
    }
  }
}
