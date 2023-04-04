#!/usr/bin/env node
const yargs = require('yargs/yargs')

const cliArgs = yargs(process.argv.slice(2))
  .boolean('v')
  .alias('v', 'verbose')
  .describe('v', 'enable detailed debugging output from sauce-connect').argv

import('../util/saucelabs.mjs').then(({ startSauceConnect }) =>
  startSauceConnect(cliArgs)
)
