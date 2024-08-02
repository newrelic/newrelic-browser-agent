import { parseSpecString, equationIsTrue } from './spec-parser.mjs'

const latestBrowserVersions = require('../browsers-lists/lt-desktop-latest-vers.json')

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

    const ruleNumericVersion = Number(this.#browserVersion) // 'someString', '125.0.623' are not accepted
    if (!Number.isFinite(ruleNumericVersion)) throw new Error('Encountered spec rule with unsupported version format: ' + this.#specString)
    let desiredNumVersion
    browserVersion = browserVersion.toString() // need to typecast any number for string ops
    if (browserVersion.startsWith('latest')) {
      desiredNumVersion = Number(latestBrowserVersions[browserName]) - (browserVersion.split('-')[1] || 0) // converts vers string like 'latest-10' into an actual number
    } else {
      desiredNumVersion = Number(browserVersion.split('.', 2).join('.')) // converts vers string like '125.9.551.12' into simply 125.9 as we only care about major.minor vers
    }
    if (!Number.isFinite(desiredNumVersion)) throw new Error('Encountered desired spec with unsupported version format: ' + browserVersion)

    return equationIsTrue(desiredNumVersion, this.#specOperator, ruleNumericVersion)
  }
}
