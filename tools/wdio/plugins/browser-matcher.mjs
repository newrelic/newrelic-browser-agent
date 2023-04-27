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
    let skip = matcher && !matcher.match(this.#browserSpec)
    console.log('BrowserMatcher##test', this.#browserSpec)
    console.log('BrowserMatcher##test', matcher)
    console.log('BrowserMatcher##test', matcher.match(this.#browserSpec))
    console.log('BrowserMatcher##test', skip)
    return function (...args) {
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
