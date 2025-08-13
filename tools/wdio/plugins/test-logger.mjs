import logger from '@wdio/logger'

const log = logger('test-logger')

/**
 * This is a WDIO worker plugin that provides logging of tests.
 */
export default class TestLogger {
  /**
   * Gets executed testing begins in the worker thread.
   */
  async before (capabilities) {
    if (capabilities['LT:Options'].deviceName) {
      // Mobile execution
      if (capabilities['appium:platformName'] === 'android') {
        // Android Webview
        log.info(`Executing in: Android ${capabilities['LT:Options'].platformVersion}`)
      } else if (capabilities['appium:platformName'] === 'ios') {
        // iOS Webview
        log.info(`Executing in: iOS ${capabilities['LT:Options'].platformVersion}`)
      } else {
        log.info(`Executing in: ${capabilities['LT:Options'].deviceName} ${capabilities['LT:Options'].platformVersion}`)
      }
    } else {
      // Desktop execution
      if (capabilities.browserName === 'Safari') {
        log.info(`Executing in: ${capabilities.browserName} ${capabilities['LT:Options'].platformName}`)
      } else {
        log.info(`Executing in: ${capabilities.browserName} ${capabilities.browserVersion}`)
      }
    }
  }

  /**
   * Gets executed before each test execution. At this point you can access to all global
   * variables like `browser`.
   *
   * This is where we log out which individual test is being run.
   */
  async beforeTest (test) {
    let title = test.title
    if (test.parent) {
      title = `${test.parent}.${title}`
    }
    log.info('Running Test: ' + title)
  }
}
