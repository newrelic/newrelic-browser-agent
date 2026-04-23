/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isFileProtocol } from '../url/protocol'
import { warn } from './console'

/**
 * Represents an obfuscation rule that can be applied to harvested payloads
 * @typedef {object} ObfuscationRule
 * @property {string|RegExp} regex The regular expression to match against in the payload
 * @property {string} [replacement] The string to replace the matched regex with
 * @property {string[]} [eventFilter] An optional list of event types to which this rule should be applied. If not provided, or an empty array, the rule will be applied to all events.
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
   * @param {Object} agentRef - Reference to the agent instance
   * @param {string} [eventType] - Optional event type this obfuscator instance handles.
   *                               If provided, only rules matching this event type (or rules with no eventFilter) will be applied.
   */
  constructor (agentRef, eventType) {
    this.agentRef = agentRef
    this.eventType = eventType
    this.warnedRegexMissing = false
    this.warnedInvalidRegex = false
    this.warnedInvalidReplacement = false
  }

  get obfuscateConfigRules () {
    const allRules = this.agentRef.init.obfuscate || []

    // If this instance has no specific event type, return all rules
    if (!this.eventType) return allRules

    // Filter rules to only those that apply to this instance's event type
    return allRules.filter(rule => {
      // If rule has no eventFilter, it applies to all events
      if (!rule.eventFilter || !Array.isArray(rule.eventFilter) || rule.eventFilter.length === 0) {
        return true
      }
      // Otherwise, check if this instance's event type matches the rule's filter
      return rule.eventFilter.includes(this.eventType)
    })
  }

  /**
   * Applies all valid obfuscation rules to the provided input string
   * @param {string} input String to obfuscate
   * @returns {string}
   */
  obfuscateString (input) {
    // if input is not of type string or is an empty string, short-circuit
    if (typeof input !== 'string' || input.trim().length === 0) return input

    const rules = (this.obfuscateConfigRules).map(rule => this.validateObfuscationRule(rule))
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
   * Traverses an object and obfuscates all string properties.
   * This instance will only apply rules that match its configured event type (if any).
   * For features with mixed event types in their payloads (like generic_events), this will
   * traverse the object and check each object's eventType property against the rules.
   * @param {Object|Array} obj - The object or array to traverse
   * @returns {Object|Array} The modified object
   */
  traverseAndObfuscateEvents (obj) {
    if (!obj || typeof obj !== 'object') return obj

    // If this instance was configured with a specific event type, obfuscate everything
    // (rules are already filtered in obfuscateConfigRules getter)
    if (this.eventType) {
      this.#applyFnToAllStrings(obj, this.obfuscateString.bind(this))
      return obj
    }

    // For generic obfuscators (no specific event types), check individual eventType properties
    // This path is for features like generic_events that handle multiple event types
    const eventTypesToObfuscate = new Set()
    let hasEventFilters = false

    this.obfuscateConfigRules.forEach(rule => {
      if (rule.eventFilter && Array.isArray(rule.eventFilter) && rule.eventFilter.length > 0) {
        hasEventFilters = true
        rule.eventFilter.forEach(eventType => eventTypesToObfuscate.add(eventType))
      }
    })

    // If no rules have eventFilters, obfuscate everything
    if (!hasEventFilters) {
      this.#applyFnToAllStrings(obj, this.obfuscateString.bind(this))
      return obj
    }

    // Selectively obfuscate based on eventType properties found in the data
    this.#applyFnWithEventTypeFilter(obj, this.obfuscateString.bind(this), Array.from(eventTypesToObfuscate), null)
    return obj
  }

  /**
   * Recursively applies a function to all string properties in an object.
   * @param {Object|Array} obj - The object or array to traverse
   * @param {Function} fn - The function to apply to string properties
   * @private
   */
  #applyFnToAllStrings (obj, fn) {
    if (!obj || typeof obj !== 'object') return

    Object.keys(obj).forEach(property => {
      const value = obj[property]

      if (typeof value === 'object' && value !== null) {
        this.#applyFnToAllStrings(value, fn)
      } else if (typeof value === 'string') {
        obj[property] = fn(value)
      }
    })
  }

  /**
   * Recursively applies a function to string properties based on eventType filtering.
   * @param {Object|Array} obj - The object or array to traverse
   * @param {Function} fn - The function to apply to string properties
   * @param {string[]} eventTypes - Array of event types to obfuscate
   * @param {boolean|null} shouldObfuscate - Track obfuscation state: null = not determined yet, true = obfuscate, false = don't obfuscate
   * @private
   */
  #applyFnWithEventTypeFilter (obj, fn, eventTypes, shouldObfuscate) {
    if (!obj || typeof obj !== 'object') return

    // Determine the obfuscation state for this object
    let currentShouldObfuscate = shouldObfuscate

    // Check if this object has an eventType property
    if ('eventType' in obj && typeof obj.eventType === 'string') {
      currentShouldObfuscate = eventTypes.includes(obj.eventType)
    }

    // If we've determined not to obfuscate this branch, stop here
    if (currentShouldObfuscate === false) {
      return
    }

    // Process all properties
    Object.keys(obj).forEach(property => {
      const value = obj[property]

      if (typeof value === 'object' && value !== null) {
        // Recursively traverse objects/arrays, passing the current obfuscation state
        this.#applyFnWithEventTypeFilter(value, fn, eventTypes, currentShouldObfuscate)
      } else if (typeof value === 'string' && currentShouldObfuscate === true) {
        // Only obfuscate strings if we've determined we should (true)
        // If currentShouldObfuscate is null, we haven't found an eventType yet, so don't obfuscate
        obj[property] = fn(value)
      }
    })
  }

  /**
   * Validates an obfuscation rule and provides errors if any are found.
   * @param {ObfuscationRule} rule The rule to validate
   * @returns {ObfuscationRuleValidation} The validation state of the rule
   */
  validateObfuscationRule (rule) {
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
