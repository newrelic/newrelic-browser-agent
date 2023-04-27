import MatcherRule, { MATCHER_TYPE } from './matcher-rule.mjs'

/**
 * Constructs a set of rules that can be used to test
 * if a given browser spec string meets those rules.
 */
export default class SpecMatcher {
  #rules

  constructor () {
    this.#rules = []
  }

  /**
   * Creates a new spec matcher instance with the same set of rules. This
   * can be used to extend an existing spec matcher without altering it.
   * @returns {SpecMatcher} The new spec matcher instance
   */
  clone () {
    const cloneMatcher = new SpecMatcher()
    this.#rules.forEach(rule => cloneMatcher.push(rule.clone()))
    return cloneMatcher
  }

  /**
   * Creates a rule that ensures the browser spec being tested is included
   * in the provided browser spec.
   * @param {string} spec Browser spec string including a spec operator
   * @returns The current spec matcher instance to continue the builder pattern
   */
  include (spec) {
    this.#rules.push(new MatcherRule(MATCHER_TYPE.INCLUDE, spec))
    return this
  }

  /**
   * Creates a rule that ensures the browser spec being tested is excluded
   * in the provided browser spec.
   * @param {string} spec A browser spec string including a spec operator
   * @returns The current spec matcher instance to continue the builder pattern
   */
  exclude (spec) {
    this.#rules.push(new MatcherRule(MATCHER_TYPE.EXCLUDE, spec))
    return this
  }

  /**
   * Test the given browser spec string meets the rules defined in the current
   * spec matcher instance
   * @param {string} spec A browser spec string including the `@` spec operator
   * @returns
   */
  test (spec) {
    return this.#rules.reduce((aggregate, rule) => aggregate && rule.test(spec), true)
  }
}
