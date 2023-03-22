import os from 'os'
import process from 'process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { deepmerge } from 'deepmerge-ts'
import { Launcher } from '@wdio/cli'
import baseConfig from './config/base.conf.mjs'
import seleniumConfig from './config/selenium.conf.mjs'
import sauceConfig from './config/sauce.conf.mjs'
import specsConfig from './config/specs.conf.mjs'

/**
 * The JIL runner utilizes the CLI arguments to dynamically generate the
 * wdio configuration file. The file is written to disk and passed to the
 * wdio launcher. WDIO is launched this way to ensure the configuration is
 * properly passed to the worker processes.
 */

const wdioConfig = deepmerge(baseConfig(), seleniumConfig(), sauceConfig(), specsConfig())
const configFilePath = path.join(
  os.tmpdir(),
  `wdio.conf_${crypto.randomBytes(16).toString('hex')}.mjs`
)

if (['trace', 'debug', 'info'].indexOf(wdioConfig.logLevel) > -1) {
  console.log(`Writing wdio config file to ${configFilePath}`)
}

// Clear the JIL CLI params before starting wdio so they are not passed to worker processes
process.argv.splice(2)

fs.writeFile(
  configFilePath,
  `export const config = JSON.parse(\`${JSON.stringify(wdioConfig)}\`)`,
  (error) => {
    if (error) {
      console.error(error)
      process.exit(1)
    }

    const wdio = new Launcher(configFilePath)
    wdio.run().then(
      (exitCode) => {
        // testingServer.stop();
        process.exit(exitCode)
      },
      (error) => {
        // testingServer.stop();
        console.error('Launcher failed to start the test', error.stacktrace)
        process.exit(1)
      }
    )
  }
)
