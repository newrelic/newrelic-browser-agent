const process = require('process')
const yargs = require('yargs')
const {hideBin} = require('yargs/helpers')

const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('license-key')
  .describe('license-key', 'License key for the load test')

  .string('app-id')
  .describe('app-id', 'App ID for the load test')

  .string('entity-guid')
  .describe('entity-guid', 'Entity GUID for the load test')

  .demandOption(['license-key', 'app-id', 'entity-guid'], 'Please provide the required options: license-key, app-id, and entity-guid')
  .argv

  module.exports = {args}