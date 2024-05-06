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
   * variables like `browser`. It is the perfect place to define custom commands.
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
}
export const launcher = TestingServerLauncher
