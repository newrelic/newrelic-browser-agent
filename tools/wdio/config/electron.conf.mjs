import crypto from 'node:crypto'
import fs from 'node:fs'
import module from 'node:module'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'
import { parseSpecString } from '../../browser-matcher/spec-parser.mjs'
import { packagedExecutable } from '../../local-browsers/electron/build.mjs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const APP_DIR = path.resolve(__dirname, '../../local-browsers/electron')
const CHROMEDRIVER_PORT = 9515
const MODES = ['loose', 'strict']

/**
 * Works out which Electron security modes a `-b` browser spec asks for: `electron` and `electron-loose`
 * are the loose mode and `electron-strict` the strict one (ask for both with `electron-loose,electron-strict`).
 * Electron runs on this machine with its own chromedriver while every other browser runs on LambdaTest,
 * so the two can't share a run.
 * @param {string} [spec] The comma separated `-b` browsers value
 * @param {boolean} [framework] Whether this is a `--framework` run
 * @returns {string[]} The requested modes, empty when the spec has no Electron entry
 * @throws {Error} If Electron is combined with other browsers, an unknown mode is requested, or strict
 * mode is requested outside a `--framework` run
 */
export function electronModesFromSpec (spec = '', framework = false) {
  const names = spec.split(',').map(entry => parseSpecString(entry.trim()).browserName)
  const electronNames = names.filter(name => name === 'electron' || name.startsWith('electron-'))
  if (electronNames.length === 0) return []
  if (electronNames.length !== names.length) throw new Error(`Electron cannot be combined with other browsers in one run, received: ${spec}`)

  const modes = electronNames.map(name => name === 'electron' ? 'loose' : name.slice('electron-'.length))
  const unknown = modes.find(mode => !MODES.includes(mode))
  if (unknown) throw new Error(`Unknown Electron mode "${unknown}", expected one of: ${MODES.join(', ')}`)
  /*
   * Strict mode's CSP only admits inline scripts carrying its nonce, which the framework specs supply and
   * ordinary specs don't, so those would never load the agent.
   */
  if (modes.includes('strict') && !framework) throw new Error('electron-strict can only be used with --framework runs. Use electron-loose for other specs')
  return [...new Set(modes)]
}

/**
 * Generates the wdio configuration for running specs against the packaged Electron browser
 * (tools/local-browsers/electron) on this machine, instead of against LambdaTest. The folder's own
 * `electron-chromedriver` package is used so the driver always matches the Chromium inside the
 * Electron being tested. The packaged app must already be built (see `ensureBuilt`, which the runner
 * calls when an Electron browser is requested).
 *
 * @param {string[]} modes The security modes (see the app's main.cjs) to run a session for
 * @param {object} [options]
 * @param {boolean} [options.devtools] Open a DevTools window with each Electron window
 * @returns An object defining the local Electron capabilities and chromedriver service.
 */
export default function config (modes, { devtools = false } = {}) {
  const appRequire = module.createRequire(path.join(APP_DIR, 'package.json'))
  const driverPath = path.join(path.dirname(appRequire.resolve('electron-chromedriver/package.json')), 'bin', 'chromedriver')

  /*
   * Electron-hosted terminals (e.g. VS Code) export ELECTRON_RUN_AS_NODE, which makes the Electron
   * binary behave as plain Node and exit immediately instead of opening the app window.
   */
  delete process.env.ELECTRON_RUN_AS_NODE

  // Sessions can run concurrently (`--concurrent`), so they get a nonce and userData dir of their own. Only strict mode uses a nonce.
  const runId = crypto.randomBytes(8).toString('hex')
  const userDataDirs = modes.map(mode => fs.mkdtempSync(path.join(os.tmpdir(), 'nr-electron-' + mode + '-')))

  return {
    hostname: '127.0.0.1',
    port: CHROMEDRIVER_PORT,
    path: '/',
    /*
     * One session per requested security mode. A single chromedriver serves all of them; each app
     * instance gets its own user-data-dir so concurrent windows never share storage or profile locks.
     * The mode and CSP nonce are read back from these args by tools/browsers-lists/utils.mjs and the specs.
     */
    capabilities: modes.map((mode, i) => {
      return {
        browserName: 'chrome',
        'goog:chromeOptions': {
          binary: packagedExecutable(),
          args: [
            `--nr-mode=${mode}`,
            ...(mode === 'strict' ? [`--nr-csp-nonce=${runId}`] : []),
            ...(devtools ? ['--nr-devtools'] : []),
            `--user-data-dir=${userDataDirs[i]}`,
            // Linux CI runners cannot use the chromium sandbox; only the test app runs here
            ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu'] : [])
          ]
        }
      }
    }),
    services: [
      [path.resolve(__dirname, '../plugins/electron-chromedriver.mjs'), { driverPath, port: CHROMEDRIVER_PORT, tempDirs: userDataDirs }]
    ]
  }
}
