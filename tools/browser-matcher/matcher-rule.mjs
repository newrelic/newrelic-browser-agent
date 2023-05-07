import { parseSpecString, SPEC_OPERATOR } from './spec-parser.mjs'

export const MATCHER_TYPE = {
  INCLUDE: 'include',
  EXCLUDE: 'exclude'
}

/**
 * Represents a browser matching rule of the defined type
 * allowing comparison between two browser specs strings.
 */
export default class MatcherRule {
  #matcherType
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
   * @param {MATCHER_TYPE} matcherType Type of matching to do between the two browser specs
   * @param {string} spec The base browser spec string to compare against
   */
  constructor (matcherType, specString) {
    if (!matcherType || !specString) throw new Error('MatcherRule requires a matcherType and specString')

    this.#matcherType = matcherType
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
    return new MatcherRule(this.#matcherType, this.#specString)
  }

  /**
   * Compares the provided browser spec against the base browser spec used
   * to construct this matcher rule.
   * @param {string} spec The browser spec to compare against the base browser spec
   */
  test (spec) {
    const { browserName, _, browserVersion } = parseSpecString(spec)

    if (this.#matcherType === MATCHER_TYPE.EXCLUDE && this.#browserName !== browserName) {
      return true
    } else if (this.#matcherType === MATCHER_TYPE.INCLUDE && this.#browserName !== browserName) {
      return false
    }

    if (!this.#browserVersion || this.#browserVersion === '*') {
      return this.#matcherType === MATCHER_TYPE.INCLUDE
    }

    return (() => {
      switch (this.#specOperator) {
        case SPEC_OPERATOR.AT:
          return (
            (this.#matcherType === MATCHER_TYPE.INCLUDE && browserVersion === this.#browserVersion) ||
            (this.#matcherType === MATCHER_TYPE.EXCLUDE && browserVersion !== this.#browserVersion)
          )
        case SPEC_OPERATOR.GT:
          return (
            (this.#matcherType === MATCHER_TYPE.INCLUDE && browserVersion > this.#browserVersion) ||
            (this.#matcherType === MATCHER_TYPE.EXCLUDE && browserVersion <= this.#browserVersion)
          )
        case SPEC_OPERATOR.LT:
          return (
            (this.#matcherType === MATCHER_TYPE.INCLUDE && browserVersion < this.#browserVersion) ||
            (this.#matcherType === MATCHER_TYPE.EXCLUDE && browserVersion >= this.#browserVersion)
          )
        case SPEC_OPERATOR.GTE:
          return (
            (this.#matcherType === MATCHER_TYPE.INCLUDE && browserVersion >= this.#browserVersion) ||
            (this.#matcherType === MATCHER_TYPE.EXCLUDE && browserVersion < this.#browserVersion)
          )
        case SPEC_OPERATOR.LTE:
          return (
            (this.#matcherType === MATCHER_TYPE.INCLUDE && browserVersion <= this.#browserVersion) ||
            (this.#matcherType === MATCHER_TYPE.EXCLUDE && browserVersion > this.#browserVersion)
          )
        default:
          return false
      }
    })()
  }
}
