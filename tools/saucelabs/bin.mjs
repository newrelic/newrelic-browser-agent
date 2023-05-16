#!/usr/bin/env node

import process from 'process'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { startSauceConnect } from './utils.mjs'

const cliArgs = yargs(hideBin(process.argv))
  .boolean('v')
  .alias('v', 'verbose')
  .describe('v', 'enable detailed debugging output from sauce-connect').argv

startSauceConnect(cliArgs)
