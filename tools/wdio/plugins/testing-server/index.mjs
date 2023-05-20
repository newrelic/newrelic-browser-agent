import TestingServerLauncher from './launcher.mjs'
import { TestHandleConnector } from './test-handle-connector.mjs'

/**
 * This is a WDIO worker plugin that provides access to the testing server via
 * a test handle connector.
 */
export default class TestingServerWorker {
  #commandServerPort

  beforeSession (_, capabilities) {
    this.#commandServerPort = capabilities.testServerCommandPort
    delete capabilities.testServerCommandPort
  }

  /**
   * Gets executed before test execution begins. At this point you can access to all global
   * variables like `browser`. It is the perfect place to define custom commands.
   */
  async before () {
    browser.addCommand('getTestHandle', async () => {
      const testHandle = new TestHandleConnector(this.#commandServerPort)
      await testHandle.ready()
      return testHandle
    })
  }
}
export const launcher = TestingServerLauncher
