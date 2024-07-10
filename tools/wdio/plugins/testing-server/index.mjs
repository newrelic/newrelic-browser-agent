import TestingServerLauncher from './launcher.mjs'
import { TestHandleConnector } from './test-handle-connector.mjs'
import { deserialize } from '../../../shared/serializer.js'

/**
 * This is a WDIO worker plugin that provides access to the testing server via
 * a test handle connector.
 */
export default class TestingServerWorker {
  #assetServerConfig
  #bamServerConfig
  #commandServerConfig

  beforeSession (_, capabilities) {
    this.#assetServerConfig = deserialize(capabilities.assetServer)
    this.#bamServerConfig = deserialize(capabilities.bamServer)
    this.#commandServerConfig = deserialize(capabilities.commandServer)

    delete capabilities.assetServer
    delete capabilities.bamServer
    delete capabilities.commandServer
  }

  /**
   * Gets executed before test execution begins. At this point you can access to all global
   * variables like `browser`.
   *
   * This is where we add the custom command to create a new instance of the TestHandleConnector.
   */
  async before () {
    browser.addCommand('getTestHandle', async () => {
      const testHandle = new TestHandleConnector(
        this.#assetServerConfig,
        this.#bamServerConfig,
        this.#commandServerConfig
      )
      await testHandle.ready()
      return testHandle
    })
  }

  /**
   * Gets executed before test execution end but before any beforeEach and beforeAll hooks.
   * At this point you can access to all global variables like `browser`.
   *
   * This is where we double check there are no network captures with outstanding unresolved
   * awaits. If there are, the test will be manually failed.
   */
  async afterTest (test, _, result) {
    if (browser.testHandle && result.passed) {
      const networkCapturesWaiting = browser.testHandle.networkCaptures
        .filter(networkCapture => networkCapture.awaitingResults)
      if (networkCapturesWaiting.length > 0) {
        test.callback(new Error('Network captures with pending awaits exist'))
      }
    }
  }
}
export const launcher = TestingServerLauncher
