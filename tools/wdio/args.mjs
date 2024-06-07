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

  .boolean('D')
  .default('D', false)
  .alias('D', 'sauce-extended-debugging')
  .describe('D', 'Run tests with sauce labs extended debugging enabled')

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

  .boolean('s')
  .alias('s', 'sauce')
  .describe('s', 'launch sauce before running tests')

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
  .describe('session-timeout', 'timout in ms for sauce labs browser session')
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

  .boolean('q')
  .default('q', false)
  .alias('q', 'quiet')
  .describe('q', 'dont output to stdout')

  .boolean('P')
  .alias('P', 'polyfills')
  .describe('P', 'inject polyfills and polyfill loaders into test pages')

  .boolean('D')
  .default('D', false)
  .alias('D', 'sauce-extended-debugging')
  .describe('D', 'Run tests with sauce labs extended debugging enabled')

  .boolean('coverage')
  .default('coverage', false)
  .describe('coverage', 'Collect coverage from test runs')

  .boolean('webview')
  .default('webview', false)
  .describe('webview', 'Run webview tests')

  .boolean('lt')
  .default('lt', false)
  .describe('lt', 'Run with lambda test')

  .middleware(argv => {
    if (argv.webview && (!argv.browsers || argv.browsers === 'chrome@latest')) {
      argv.browsers = argv.b = 'ios@latest,android@latest'
    }
  })

  .check(argv => {
    if (argv.webview && argv.coverage) {
      return 'Arguments webview and coverage are mutually exclusive'
    }
    if (argv.webview && argv.polyfills) {
      return 'Arguments webview and polyfills are mutually exclusive'
    }
    if (argv.coverage && argv.polyfills) {
      return 'Arguments coverage and polyfills are mutually exclusive'
    }

    return true
  })

  .help('h')
  .alias('h', 'help').argv

export default args
