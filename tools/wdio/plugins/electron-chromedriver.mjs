import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'

/**
 * This is a WDIO launcher plugin that starts the chromedriver bundled with the Electron framework
 * test app (`electron-chromedriver`, version-matched to the app's `electron`) for the duration of
 * the run, and removes the Electron instances' temporary user-data-dirs when it ends. WDIO then talks
 * to it like any local chromedriver, with the Electron binary as the "chrome" binary under test.
 */
export default class ElectronChromedriverLauncher {
  #chromedriver
  #port
  #driverPath
  #tempDirs

  constructor ({ driverPath, port, tempDirs = [] }) {
    this.#driverPath = driverPath
    this.#port = port
    this.#tempDirs = tempDirs
  }

  async onPrepare () {
    // A leftover driver would be reused silently, with a stale environment, so refuse to start instead
    if (await this.#canConnect()) throw new Error(`Port ${this.#port} is already in use, is a previous chromedriver still running?`)

    this.#chromedriver = spawn(this.#driverPath, [`--port=${this.#port}`], { stdio: 'inherit' })
    this.#chromedriver.on('error', error => {
      console.error('Electron chromedriver failed to start', error)
      process.exit(1)
    })

    // Wait until chromedriver is accepting connections before WDIO tries to open sessions
    const deadline = Date.now() + 15000
    while (!(await this.#canConnect())) {
      if (Date.now() > deadline) throw new Error(`Electron chromedriver did not start listening on port ${this.#port}`)
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  async onComplete () {
    this.#chromedriver?.kill()
    // Each Electron instance's throwaway user-data-dir (see electron.conf.mjs)
    this.#tempDirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true }))
  }

  #canConnect () {
    return new Promise(resolve => {
      const socket = net.connect(this.#port, '127.0.0.1')
      socket.once('connect', () => { socket.destroy(); resolve(true) })
      socket.once('error', () => resolve(false))
    })
  }
}
export const launcher = ElectronChromedriverLauncher
