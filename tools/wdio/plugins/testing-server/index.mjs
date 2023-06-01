import TestingServerLauncher from './launcher.mjs'
import { TestHandleConnector } from './test-handle-connector.mjs'

/**
 * This is a WDIO worker plugin that provides access to the testing server via
 * a test handle connector.
 */
export default class TestingServerWorker {
  #testingServerIndex = 0
  #commandServerPorts

  beforeSession (_, capabilities) {
    this.#commandServerPorts = capabilities.testServerCommandPorts
    delete capabilities.testServerCommandPorts

    if (!Array.isArray(this.#commandServerPorts) || this.#commandServerPorts.length === 0) {
      throw new Error('No testing server command ports were passed to the child WDIO process.')
    }
  }

  /**
   * Gets executed before test execution begins. At this point you can access to all global
   * variables like `browser`. It is the perfect place to define custom commands.
   */
  async before () {
    browser.addCommand('getTestHandle', async () => {
      const testHandle = new TestHandleConnector(this.#getNextTestingServer())
      await testHandle.ready()
      return testHandle
    })
  }

  #getNextTestingServer () {
    if (this.#testingServerIndex + 1 > this.#commandServerPorts.length) {
      this.#testingServerIndex = 0
    }

    const nextTestingServerCommandPort = this.#commandServerPorts[this.#testingServerIndex]
    this.#testingServerIndex = this.#testingServerIndex + 1
    return nextTestingServerCommandPort
  }
}
export const launcher = TestingServerLauncher
