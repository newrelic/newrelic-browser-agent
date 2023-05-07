/**
 * This is a WDIO worker plugin that provides a global method allowing for the
 * filtering of tests by a browser match.
 */
export default class BrowserMatcher {
  #browserSpec

  async beforeSession (_, capabilities) {
    this.#browserSpec =
      `${this.#getBrowserName(capabilities)}@${capabilities.browserVersion || capabilities.version}`
    global.test = this.#test.bind(this)
  }

  #test (matcher) {
    let skip = matcher && !matcher.test(this.#browserSpec)

    return function (...args) {
      /*
        We only call global.it for tests that are not skipped. This registers the test
        with the mocha engine. When all tests in a file are skipped, WDIO will not launch
        a browser in SauceLabs.

        Do not use global.it.skip. This still registers the test with mocha and will cause
        WDIO to launch a browser in SauceLabs. If all the tests are skipped in a file, this
        is a waste of time.
      */
      if (!skip) {
        global.it.apply(this, args)
      }
    }
  }

  #getBrowserName ({ browserName }) {
    if (browserName === 'internet explorer') {
      return 'ie'
    }
    if (browserName === 'MicrosoftEdge') {
      return 'edge'
    }

    return browserName
  }
}
