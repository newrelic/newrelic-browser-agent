import MatcherRule from './matcher-rule.mjs'

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
    this.#rules.push(new MatcherRule(spec))
    return this
  }

  /**
   * Test the given browser version meets the rules defined in the current
   * spec matcher instance.
   * @param {string} browserName The name of the browser like `chrome`
   * @param {string} browserVersion The version of the browser like `99`
   * @returns
   */
  test (browserName, browserVersion) {
    if (this.#rules.length === 0) return false

    return this.#rules.reduce((aggregate, rule) => aggregate && rule.test(browserName, browserVersion), true)
  }
}
