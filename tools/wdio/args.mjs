import process from 'process'
import yargs from 'yargs/yargs'
import loaders from './util/loaders.js'

const args = yargs(process.argv.slice(2))
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
  .requiresArg('b')
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

  .boolean('selenium')
  .default('selenium', false)
  .describe(
    'selenium',
    'run tests against a selenium server instead of sauce labs'
  )

  .string('selenium-host')
  .default('selenium-host', 'localhost')
  .describe(
    'selenium-host',
    'host of the Selenium server to run tests against, e.g. "localhost"'
  )

  .number('selenium-port')
  .default('selenium-port', 4444)
  .describe(
    'selenium-port',
    'port of the Selenium server to run tests against, e.g. "4444"'
  )

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

  .alias('t', 'timeout')
  .describe('t', 'timeout in ms for tests and calls to the collector APIs')
  .default('t', 32000)

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

  .boolean('A')
  .default('A', false)
  .alias('A', 'all-browsers')
  .describe('A', 'Run tests against all browsers, even unsupported ones')

  .help('h')
  .alias('h', 'help').argv

export default args
