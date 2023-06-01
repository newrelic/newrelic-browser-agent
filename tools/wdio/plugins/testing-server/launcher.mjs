import process from 'process'
import childProcess from 'child_process'
import path from 'path'
import url from 'url'
import logger from '@wdio/logger'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const testingServerModule = path.resolve(__dirname, '../../bin/server.js')
const testingServerCwd = path.resolve(__dirname, '../../../../')
let testingServerId = 0

/**
 * This is a WDIO launcher plugin that starts the testing servers.
 */
export default class TestingServerLauncher {
  #testingServerProcs = []
  #testingServerCommandPorts = []

  async onPrepare (config, capabilities) {
    const maxTestingServers = Math.min(
      5, // Max out at 5 test servers
      Math.floor(config.maxInstances / 4) || 1
    )
    process.setMaxListeners(Infinity)
    await Promise.all(
      [...Array(maxTestingServers)]
        .map(() => this.#createTestingServerProcess())
    )

    capabilities.forEach((capability) => {
      capability.testServerCommandPorts = this.#testingServerCommandPorts
    })
  }

  async onComplete () {
    await Promise.all([
      this.#testingServerProcs.map(child => {
        return new Promise(resolve => {
          child.on('exit', resolve)
          child.kill()
        })
      })
    ])
  }

  async #createTestingServerProcess () {
    await new Promise((resolve) => {
      const testingServerLogger = logger(`testing-server-${testingServerId++}`)
      const abortController = new AbortController()
      const child = childProcess.fork(
        testingServerModule,
        [...process.argvOriginal, '-p', '-1'],
        { cwd: testingServerCwd, stdio: 'pipe', signal: abortController.signal }
      )

      const serverStartTimeout = setTimeout(abortController.abort, 5000);

      ['SIGINT', 'SIGUSR1', 'SIGUSR2', 'SIGTERM', 'exit'].forEach((eventType) => {
        process.on(eventType, () => child.kill())
      })

      child.on('message', (message) => {
        if (message?.commandServer?.port) {
          clearTimeout(serverStartTimeout)
          this.#testingServerProcs.push(child)
          this.#testingServerCommandPorts.push(message.commandServer.port)
          resolve()
        }
      })
      child.stdout.on('data', (data) => {
        if (data) {
          testingServerLogger.log(data.toString())
        }
      })
      child.stderr.on('data', (data) => {
        if (data) {
          testingServerLogger.error(data.toString())
        }
      })
    })
  }
}
