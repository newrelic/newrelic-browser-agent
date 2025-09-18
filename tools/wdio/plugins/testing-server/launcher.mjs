import logger from '@wdio/logger'
import TestServer from '../../../testing-server/index.js'
import { serialize } from '../../../shared/serializer.js'

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
    log.info(`BAM server started on http://${this.#testingServer.bamServer.host}:${this.#testingServer.bamServer.port}`)
    log.info(`Command server started on http://${this.#testingServer.commandServer.host}:${this.#testingServer.commandServer.port}`)

    capabilities.forEach((capability) => {
      /** these props will be deleted later before sending to LT */
      capability.assetServer = serialize({ host: this.#testingServer.assetServer.host, port: this.#testingServer.assetServer.port })
      capability.bamServer = serialize({ host: this.#testingServer.bamServer.host, port: this.#testingServer.bamServer.port })
      capability.commandServer = serialize({ host: this.#testingServer.commandServer.host, port: this.#testingServer.commandServer.port })
    })
  }

  async onComplete () {
    const shutdownStart = performance.now()

    await this.#testingServer.stop()

    log.info(`Shutdown in ${Math.round(performance.now() - shutdownStart)}ms`)
  }
}
