import fs from 'node:fs'
import module from 'node:module'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'
import { parseSpecString } from '../../browser-matcher/spec-parser.mjs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const APP_DIR = path.resolve(__dirname, '../../test-builds/frameworks/electron')
const CHROMEDRIVER_PORT = 9515
const MODES = ['loose', 'strict']

/**
 * Works out which Electron security modes a `-b` browser spec asks for: `electron` is every mode and
 * `electron-loose` / `electron-strict` just that one. Electron runs on this machine with its own
 * chromedriver while every other browser runs on LambdaTest, so the two can't share a run.
 * @param {string} [spec] The comma separated `-b` browsers value
 * @returns {string[]} The requested modes, empty when the spec has no Electron entry
 * @throws {Error} If Electron is combined with other browsers or an unknown Electron mode is requested
 */
export function electronModesFromSpec (spec = '') {
  const names = spec.split(',').map(entry => parseSpecString(entry.trim()).browserName)
  const electronNames = names.filter(name => name === 'electron' || name.startsWith('electron-'))
  if (electronNames.length === 0) return []
  if (electronNames.length !== names.length) throw new Error(`Electron cannot be combined with other browsers in one run, received: ${spec}`)

  const modes = electronNames.flatMap(name => name === 'electron' ? MODES : [name.slice('electron-'.length)])
  const unknown = modes.find(mode => !MODES.includes(mode))
  if (unknown) throw new Error(`Unknown Electron mode "${unknown}", expected one of: ${MODES.join(', ')}`)
  return [...new Set(modes)]
}

/**
 * Finds the executable electron-packager produced for this platform and architecture.
 * @returns {string} Absolute path to the packaged app's executable.
 */
function packagedExecutable () {
  const outDir = path.join(APP_DIR, 'out')
  const packageDir = (fs.existsSync(outDir) ? fs.readdirSync(outDir) : [])
    .find(dir => dir === `framework-electron-${process.platform}-${process.arch}`)
  if (!packageDir) {
    throw new Error(`No packaged Electron app for ${process.platform}-${process.arch} in ${outDir}. Run \`npm run build:frameworks\` first.`)
  }

  const root = path.join(outDir, packageDir)
  if (process.platform === 'darwin') return path.join(root, 'framework-electron.app/Contents/MacOS/framework-electron')
  if (process.platform === 'win32') return path.join(root, 'framework-electron.exe')
  return path.join(root, 'framework-electron')
}

/**
 * Generates the wdio configuration for running specs against the packaged Electron framework test app
 * (tools/test-builds/frameworks/electron, packaged by its `npm run build`) on this machine, instead of
 * against LambdaTest. The app's own `electron-chromedriver` package is used so the driver always matches
 * the Chromium inside the app's Electron; build the app first (`npm run build:frameworks`).
 *
 * @param {string[]} modes The security modes (see the app's main.cjs) to run a session for
 * @returns An object defining the local Electron capabilities and chromedriver service.
 */
export default function config (modes) {
  const appRequire = module.createRequire(path.join(APP_DIR, 'package.json'))
  if (!fs.existsSync(path.join(APP_DIR, 'node_modules'))) {
    throw new Error('The Electron test app has no node_modules. Run `npm run build:frameworks` first.')
  }

  const electronBinary = packagedExecutable()
  const driverPath = path.join(path.dirname(appRequire.resolve('electron-chromedriver/package.json')), 'bin', 'chromedriver')

  /*
   * Electron-hosted terminals (e.g. VS Code) export ELECTRON_RUN_AS_NODE, which makes the Electron
   * binary behave as plain Node and exit immediately instead of opening the app window.
   */
  delete process.env.ELECTRON_RUN_AS_NODE

  return {
    hostname: '127.0.0.1',
    port: CHROMEDRIVER_PORT,
    path: '/',
    /*
     * One session per requested security mode. The packaged app reads its agent config
     * from the bootstrap file passed here; the spec writes it once the test's testId exists, and reads
     * the mode and file path back out of these args.
     */
    capabilities: modes.map(mode => {
      const bootstrapFile = path.join(os.tmpdir(), `nr-electron-bootstrap-${process.pid}-${mode}.json`)
      return {
        browserName: 'chrome',
        'goog:chromeOptions': {
          binary: electronBinary,
          args: [
            `--nr-mode=${mode}`,
            `--nr-bootstrap-file=${bootstrapFile}`,
            // Linux CI runners cannot use the chromium sandbox; only the test app runs here
            ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu'] : [])
          ]
        }
      }
    }),
    services: [
      [path.resolve(__dirname, '../plugins/electron-chromedriver.mjs'), { driverPath, port: CHROMEDRIVER_PORT }]
    ]
  }
}
