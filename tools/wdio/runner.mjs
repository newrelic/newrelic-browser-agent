import process from 'process'
import fs from 'fs-extra'
import path from 'path'
import url from 'url'
import crypto from 'crypto'
import { deepmerge } from 'deepmerge-ts'
import { Launcher } from '@wdio/cli'
import { serialize } from '../shared/serializer.js'
import baseConfig from './config/base.conf.mjs'
import specsConfig from './config/specs.conf.mjs'
import lambdaTestConfig from './config/lambdatest.conf.mjs'
import args from './args.mjs'
import { FAILED_SPECS_DIR, SUMMARY_FILE } from './util/failed-specs.mjs'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

/**
 * The runner utilizes the CLI arguments to dynamically generate the
 * wdio configuration file. The file is written to disk and passed to the
 * wdio launcher. WDIO is launched this way to ensure the configuration is
 * properly passed to the worker processes.
 */

const wdioConfig = deepmerge(
  baseConfig(),
  specsConfig(),
  lambdaTestConfig()
)
const configFilePath = path.join(
  path.resolve(__dirname, '../../node_modules/.cache/wdio'),
  `wdio.conf_${crypto.randomBytes(16).toString('hex')}.mjs`
)

if (args.verbose) {
  console.log(`Writing wdio config file to ${configFilePath}`)
}

// Clean output directories
fs.emptyDirSync(path.dirname(configFilePath))
fs.emptyDirSync(FAILED_SPECS_DIR)

// Clear the CLI params before starting wdio so they are not passed to worker processes
process.argv.splice(2)
fs.writeFile(
  configFilePath,
  `import { deserialize } from '../../../tools/shared/serializer.js'\nexport const config = deserialize('${serialize(wdioConfig)}')`,
  (error) => {
    if (error) {
      console.error(error)
      process.exit(1)
    }

    const wdio = new Launcher(configFilePath)
    wdio.run().then(
      (exitCode) => {
        // testingServer.stop();
        const failedSpecs = fs.readdirSync(FAILED_SPECS_DIR)
          .filter(file => file.endsWith('.json'))
          .map(file => fs.readJsonSync(path.join(FAILED_SPECS_DIR, file)).spec)
        fs.outputJsonSync(SUMMARY_FILE, { failedSpecs })
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
