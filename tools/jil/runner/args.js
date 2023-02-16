/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// if (findIndexWithRegex(process.argv, /^--$/) >= 0) process.argv.splice(process.argv.indexOf('--'), 1)

const yargs = require('yargs')
const loaders = require('../util/loaders')

module.exports = yargs
  .usage('$0 file1[, filen] [options]')
  .example('$0 tests/**/*.js -vb "chrome@39, firefox, ie@>8"')

  .boolean('v')
  .alias('v', 'verbose')
  .describe('v', 'if true, prints all output from each browser above summary')

  .string('b')
  .alias('b', 'browsers')
  .requiresArg('b')
  .describe('b', 'a comma seperated list of browsers with an optional semver range. (eg. chrome@>39)')

  .number('concurrent')
  .alias('concurrent', 'concurrency')
  .describe('concurrent', 'number of browser sessions to run concurrently')

  .string('session-test-threshold')
  .describe('session-test-threshold', 'minimum number of tests per session (when running more than one)')

  .string('H')
  .alias('H', 'host')
  .describe('H', 'hostname to use for communicating with the fake router and asset server')
  .default('H', 'bam-test-1.nr-local.net')

  .string('selenium-server')
  .describe('selenium-server', 'URL of the Selenium server to run tests against, e.g. "localhost:4444"')

  .boolean('r')
  .alias('r', 'retry')
  .describe('r', 'set to false when running tests locally to bypass retries')
  .default('r', true)

  .boolean('C')
  .alias('C', 'ci')
  .describe('C', 'don\'t attempt to use sauceconnect when talking to sauce labs')
  .default('C', false)

  .string('f')
  .alias('f', 'format')
  .alias('f', 'formatter')
  .describe('f', 'sets output formatter')
  .default('f', 'pretty')
  .choices('f', ['ci', 'merged', 'pretty', 'raw'])

  .boolean('T')
  .alias('T', 'timestamps')
  .describe('T', 'include timestamps in assertions (only for merged, ci formatters)')
  .default('T', false)

  .alias('t', 'timeout')
  .describe('t', 'timeout in ms for webdriver.waitFor and router.expect calls')
  .default('t', 32000)

  .boolean('L')
  .alias('L', 'log-requests')
  .describe('L', 'enable request logging')
  .default('L', false)

  .boolean('s')
  .alias('s', 'sauce')
  .describe('s', 'launch sauce before running tests')
  .default('s', false)

  .boolean('d')
  .alias('d', 'debug-shim')
  .describe('d', 'inject NRDEBUG.log shim function for debugging')
  .default('d', false)

  .alias('l', 'loader')
  .describe('l', 'default loader to inject')
  .default('l', 'full')
  .choices('l', loaders.map((l) => l.name))

  .alias('o', 'outputFile')
  .describe('o', 'if set output will also be written to this file location')

  .boolean('q')
  .default('q', false)
  .alias('q', 'quiet')
  .describe('q', 'dont output to stdout')

  .boolean('c')
  .default('c', true)
  .alias('c', 'cache')
  .describe('c', 'cache browserified files')

  .number('p')
  .default('p', 0)
  .alias('p', 'port')
  .describe('p', 'asset server port')

  .boolean('u')
  .default('u', false)
  .alias('u', 'unit-only')
  .describe('u', 'run only unit tests')

  .boolean('F')
  .default('F', false)
  .alias('F', 'functional-only')
  .describe('F', 'run only functional tests')

  .boolean('P')
  .default('P', false)
  .alias('P', 'polyfills')
  .describe('P', 'Add Polyfills script to top of page')

  .boolean('deny-list-bam')
  .default('deny-list-bam', false)
  .describe('P', 'Add bam-test-1.nr-local.net to ajax.deny_list')

  .help('h')
  .alias('h', 'help')
  .wrap(Math.min(110, yargs.terminalWidth()))
  .argv

function findIndexWithRegex (arr, exp) {
  let idx = -1
  arr.find(function (value, i) {
    if (exp.test(value)) {
      idx = i
      return
    }
  })
  return idx
}
