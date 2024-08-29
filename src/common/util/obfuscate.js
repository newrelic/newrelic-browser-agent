import { getConfigurationValue } from '../config/init'
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
  /**
   * @type {ObfuscationRuleValidation[]}
   */
  #ruleValidationCache

  constructor (agentIdentifier) {
    this.#ruleValidationCache = Obfuscator.getRuleValidationCache(agentIdentifier)
    Obfuscator.logObfuscationRuleErrors(this.#ruleValidationCache)
  }

  get ruleValidationCache () {
    return this.#ruleValidationCache
  }

  /**
   * Applies all valid obfuscation rules to the provided input string
   * @param {string} input String to obfuscate
   * @returns {string}
   */
  obfuscateString (input) {
    // if input is not of type string or is an empty string, short-circuit
    if (typeof input !== 'string' || input.trim().length === 0) return input

    return this.#ruleValidationCache
      .filter(ruleValidation => ruleValidation.isValid)
      .reduce((input, ruleValidation) => {
        const { rule } = ruleValidation
        return input.replace(rule.regex, rule.replacement || '*')
      }, input)
  }

  /**
   * Returns an array of obfuscation rules to be applied to harvested payloads
   * @param {string} agentIdentifier The agent identifier to get rules for
   * @returns {ObfuscationRuleValidation[]} The array of rules or validation states
   */
  static getRuleValidationCache (agentIdentifier) {
    /**
     * @type {ObfuscationRule[]}
     */
    let rules = getConfigurationValue(agentIdentifier, 'obfuscate') || []
    if (isFileProtocol()) {
      rules.push({
        regex: /^file:\/\/(.*)/,
        replacement: atob('ZmlsZTovL09CRlVTQ0FURUQ=')
      })
    }

    return rules.map(rule => Obfuscator.validateObfuscationRule(rule))
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

  /**
   * Logs any obfuscation rule errors to the console. This is called when an obfuscator
   * instance is created.
   * @param {ObfuscationRuleValidation[]} ruleValidationCache The cache of rule validation states
   */
  static logObfuscationRuleErrors (ruleValidationCache) {
    for (const ruleValidation of ruleValidationCache) {
      const { rule, isValid, errors } = ruleValidation
      if (isValid) continue

      if (errors.regexMissingDetected) warn(12, rule)
      else if (errors.invalidRegexDetected) warn(13, rule)
      if (errors.invalidReplacementDetected) warn(14, rule)
    }
  }
}
