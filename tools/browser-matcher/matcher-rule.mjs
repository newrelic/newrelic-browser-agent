import { parseSpecString, SPEC_OPERATOR } from './spec-parser.mjs'

/**
 * Represents a browser matching rule of the defined type
 * allowing comparison between two browser specs strings.
 */
export default class MatcherRule {
  #specString
  #browserName
  #specOperator
  #browserVersion

  /**
   * Create a new match rule
   * @example
   * // return true if the secondary spec is any version of ie
   * new MatcherRule(MATCHER_TYPE.INCLUDE, 'ie@*')
   * @example
   * // return true if the secondary spec is not any version of ie
   * new MatcherRule(MATCHER_TYPE.EXCLUDE, 'ie@*')
   * @example
   * // return true if the secondary spec is any version of ie > 9
   * new MatcherRule(MATCHER_TYPE.INCLUDE, 'ie>9')
   * @param {string} spec The base browser spec string to compare against
   */
  constructor (specString) {
    if (!specString) throw new Error('MatcherRule requires a specString')

    this.#specString = specString

    const { browserName, specOperator, browserVersion } = parseSpecString(specString)

    this.#browserName = browserName
    this.#specOperator = specOperator
    this.#browserVersion = browserVersion
  }

  /**
   * Clones the current matcher rule
   * @returns New instance of the matcher rule with the same criteria
   */
  clone () {
    return new MatcherRule(this.#specString)
  }

  /**
   * Compares the provided browser version against the base browser spec used
   * to construct this matcher rule.
   * @param {string} browserName The name of the browser like `chrome`
   * @param {string} browserVersion The version of the browser like `99`
   * @returns {boolean} true if the provided browserName and browserVersion matches
   * the current rule definition.
   */
  test (browserName, browserVersion) {
    if (!this.#browserName || this.#browserName === '*') {
      return true
    }

    if (this.#browserName !== browserName) {
      return false
    }

    if (!this.#browserVersion || this.#browserVersion === '*') {
      return true
    }

    switch (this.#specOperator) {
      case SPEC_OPERATOR.AT:
        return browserVersion === this.#browserVersion
      case SPEC_OPERATOR.GT:
        return browserVersion > this.#browserVersion
      case SPEC_OPERATOR.LT:
        return browserVersion < this.#browserVersion
      case SPEC_OPERATOR.GTE:
        return browserVersion >= this.#browserVersion
      case SPEC_OPERATOR.LTE:
        return browserVersion <= this.#browserVersion
      default:
        return false
    }
  }
}
