import TestingServerLauncher from './launcher.mjs'
import { TestHandleConnector } from './test-handle-connector.mjs'

/**
 * This is a WDIO worker plugin that provides access to the testing server via
 * a test handle connector.
 */
export default class TestingServerWorker {
  #assetServerConfig
  #corsServerConfig
  #bamServerConfig
  #commandServerConfig

  beforeSession (_, capabilities) {
    this.#assetServerConfig = JSON.parse(capabilities.assetServer)
    this.#corsServerConfig = JSON.parse(capabilities.corsServer)
    this.#bamServerConfig = JSON.parse(capabilities.bamServer)
    this.#commandServerConfig = JSON.parse(capabilities.commandServer)

    delete capabilities.assetServer
    delete capabilities.corsServer
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
        this.#corsServerConfig,
        this.#bamServerConfig,
        this.#commandServerConfig
      )
      await testHandle.ready()
      return testHandle
    })
  }
}
export const launcher = TestingServerLauncher
