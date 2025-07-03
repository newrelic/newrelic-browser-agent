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

  .boolean('page-view')
  .describe('page-view', 'harvest a page view event for every iteration')
  .default('page-view', false)

  .boolean('session-replay')
  .describe('session-replay', 'harvest (2) session events for every iteration')
  .default('session-replay', false)

  .number('minutes')
  .describe('minutes', 'Number of minutes to run the load test')
  .default('minutes', 60)

  .demandOption(['license-key', 'app-id', 'entity-guid'], 'Please provide the required options: license-key, app-id, and entity-guid')
  .argv

  module.exports = {args}