import logger from '@wdio/logger'
import TestingServerLauncher from './launcher.mjs'
import createClient from './command-client.mjs'
import { RouterModel } from './router-model.mjs'

const log = logger('jil-testing-server')

/**
 * This is a WDIO worker plugin provides access to the mockBAM server model
 * via a custom command.
 */
export default class TestingServerWorker {
  async before (capabilities, context, browser) {
    const testingServerClient = await createClient(capabilities['jil:testServerCommandPort'])

    browser.addCommand('getRouter', async function () {
      const routerModel = new RouterModel(testingServerClient, log)
      await routerModel.connect()
      return routerModel
    })
  }
}
export const launcher = TestingServerLauncher
