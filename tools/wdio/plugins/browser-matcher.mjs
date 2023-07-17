import logger from '@wdio/logger'
import { getBrowserName, getBrowserVersion } from '../../browsers-lists/utils.mjs'

const log = logger('browser-matcher')
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
    global.withBrowsersMatching = (matcher) => {
      log.warn('withBrowsersMatching() global deprecated, use it.withBrowsersMatching() or describe.withBrowsersMatching()')
      return this.#browserMatchTest(matcher, global.it)
    }
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
  }

  #extendMochaGlobal (originalGlobal) {
    Object.defineProperty(originalGlobal, 'withBrowsersMatching', {
      value: (matcher) => {
        return this.#browserMatchTest(matcher, originalGlobal)
      }
    })
  }

  #browserMatchTest (matcher, originalGlobal) {
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
        originalGlobal.apply(this, args)
      }
    }
  }
}
