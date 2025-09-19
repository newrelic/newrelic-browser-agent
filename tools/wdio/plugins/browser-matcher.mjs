import { getBrowserName, getBrowserVersion } from '../../browsers-lists/utils.mjs'

/**
 * This is a WDIO worker plugin that provides a global method allowing for the
 * filtering of tests by a browser match.
 */
export default class BrowserMatcher {
  #browserName
  #browserVersion

  async beforeSession (_, capabilities) {
    this.#browserName = getBrowserName(capabilities)
    this.#browserVersion = getBrowserVersion(capabilities)

    this.#setupMochaGlobals()
  }

  #setupMochaGlobals () {
    let globalDescribe
    Object.defineProperty(global, 'describe', {
      configurable: true,
      get: () => {
        return globalDescribe
      },
      set: (value) => {
        this.#extendMochaGlobal(value)
        globalDescribe = value
      }
    })

    let globalIt
    Object.defineProperty(global, 'it', {
      configurable: true,
      get: () => {
        return globalIt
      },
      set: (value) => {
        this.#extendMochaGlobal(value)
        globalIt = value
      }
    })

    global.browserMatch = (matcher) => {
      return !this.#browserMatchTest(matcher)
    }
  }

  #extendMochaGlobal (originalGlobal) {
    Object.defineProperty(originalGlobal, 'withBrowsersMatching', {
      value: (matcher) => {
        return this.#wrapFnWithBrowserMatcher(matcher, originalGlobal)
      }
    })
  }

  #wrapFnWithBrowserMatcher (matcher, originalGlobal) {
    const skip = this.#browserMatchTest(matcher)

    return function (...args) {
      /*
        We only call global.it for tests that are not skipped. This registers the test
        with the mocha engine. When all tests in a file are skipped, WDIO will not launch
        a browser in LambdaTest.

        Do not use global.it.skip. This still registers the test with mocha and will cause
        WDIO to launch a browser in LambdaTest. If all the tests are skipped in a file, this
        is a waste of time.
      */
      if (!skip) {
        originalGlobal.apply(this, args)
      }
    }
  }

  #browserMatchTest (matcher) {
    let skip = false

    if (Array.isArray(matcher) && matcher.length > 0) {
      for (const indexedMatcher of matcher) {
        if (!indexedMatcher.test(this.#browserName, this.#browserVersion)) {
          skip = true
          break
        }
      }
    } else if (matcher && typeof matcher.test === 'function') {
      skip = !matcher.test(this.#browserName, this.#browserVersion)
    }

    return skip
  }
}
