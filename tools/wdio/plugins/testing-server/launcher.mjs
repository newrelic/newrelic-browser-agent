import logger from '@wdio/logger'
import TestServer from '../../../testing-server/index.js'

const log = logger('testing-server')

/**
 * This is a WDIO launcher plugin that starts the testing servers.
 */
export default class TestingServerLauncher {
  #testingServer

  constructor (opts) {
    this.#testingServer = new TestServer({
      ...opts,
      logger: log
    })
  }

  async onPrepare (_, capabilities) {
    await this.#testingServer.start()

    log.info(`Asset server started on http://${this.#testingServer.assetServer.host}:${this.#testingServer.assetServer.port}`)
    log.info(`CORS server started on http://${this.#testingServer.corsServer.host}:${this.#testingServer.corsServer.port}`)
    log.info(`BAM server started on http://${this.#testingServer.bamServer.host}:${this.#testingServer.bamServer.port}`)
    log.info(`Command server started on http://${this.#testingServer.commandServer.host}:${this.#testingServer.commandServer.port}`)

    capabilities.forEach((capability) => {
      capability.testServerCommandPort = this.#testingServer.commandServer.port
    })
  }

  async onComplete () {
    await this.#testingServer.stop()
  }
}
