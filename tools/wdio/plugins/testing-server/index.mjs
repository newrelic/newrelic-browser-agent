import TestingServerLauncher from './launcher.mjs'
import { TestHandleConnector } from './test-handle-connector.mjs'

/**
 * This is a WDIO worker plugin that provides access to the testing server via
 * a test handle connector.
 */
export default class TestingServerWorker {
  async before (capabilities, context, browser) {
    const commandServerPort = capabilities['jil:testServerCommandPort']

    browser.addCommand('getTestHandle', async function () {
      const testHandle = new TestHandleConnector(commandServerPort)
      await testHandle.ready()
      return testHandle
    })
  }
}
export const launcher = TestingServerLauncher
