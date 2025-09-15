import process from 'process'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import loaders from './util/loaders.js'

const args = yargs(hideBin(process.argv))
  .usage('$0 file1[, filen] [options]')
  .example('$0 tests/**/*.js -vb "chrome@39, firefox, ie@>8"')

  .boolean('v')
  .alias('v', 'verbose')
  .describe('v', 'if true, prints all output from each browser above summary')

  .boolean('L')
  .alias('L', 'log-requests')
  .describe('l', 'if true, prints data about requests to the test server')

  .string('b')
  .alias('b', 'browsers')
  .describe(
    'b',
    'a comma seperated list of browsers with an optional semver range. (eg. chrome@>39)'
  )

  .number('concurrent')
  .default('concurrent', 1)
  .alias('concurrent', 'concurrency')
  .describe('concurrent', 'number of browser sessions to run concurrently')

  .string('H')
  .default('H', 'bam-test-1.nr-local.net')
  .alias('H', 'host')
  .describe('H', 'hostname to use for communicating with the testing server')

  .number('p')
  .default('p', 0)
  .alias('p', 'port')
  .describe('p', 'port to use for communicating with the testing server')

  .boolean('r')
  .default('r', true)
  .alias('r', 'retry')
  .describe('r', 'set to false when running tests locally to bypass retries')

  .number('t')
  .alias('t', 'timeout')
  .describe('t', 'timeout in ms for tests and calls to the collector APIs')
  .default('t', 85000)

  .number('session-timeout')
  .describe('session-timeout', 'timout in ms for LambdaTest browser session')
  .default('session-timeout', 120000)

  .boolean('d')
  .default('d', false)
  .alias('d', 'debug-shim')
  .describe(
    'd',
    'inject NRDEBUG.log shim function into testing pages for debugging'
  )

  .choices(
    'l',
    loaders.map((l) => l.name)
  )
  .default('l', 'full')
  .alias('l', 'loader')
  .describe('l', 'default loader to inject into test pages')

  .boolean('T')
  .default('T', true)
  .alias('T', 'tunnel')
  .describe('T', 'Launch LambdaTest tunnel for this test run using process.env credentials')

  .boolean('D')
  .default('D', false)
  .alias('D', 'extended-debugging')
  .describe('D', 'Run tests with LambdaTest extended debugging enabled')

  .boolean('coverage')
  .default('coverage', false)
  .describe('coverage', 'Collect coverage from test runs')

  .boolean('webview')
  .default('webview', false)
  .describe('webview', 'Run webview tests')

  .string('B')
  .alias('B', 'report-to-bam')
  .describe('B', 'Supply a JSON string or file path with expected BAM configs to send agent traffic to BAM instead of local service')

  .middleware(argv => {
    if (argv.webview && (!argv.browsers || argv.browsers === 'chrome@latest')) {
      argv.browsers = argv.b = 'ios@latest,android@latest'
    }
  })

  .check(argv => {
    if (argv.webview && argv.coverage) {
      return 'Arguments webview and coverage are mutually exclusive'
    }

    return true
  })

  .help('h')
  .alias('h', 'help').argv

export default args
