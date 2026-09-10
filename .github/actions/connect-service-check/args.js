import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .choices('environment', ['staging', 'us-prod'])
  .describe('environment', 'Which NR region to run the connect handshake against.')

  .number('account-id')
  .describe('account-id', 'Numeric NR account ID that owns the license key, used to scope the entitySearch lookup.')

  .string('license-key')
  .describe('license-key', 'APM license key used for preconnect/connect. Never logged.')

  .string('nerdgraph-api-key')
  .describe('nerdgraph-api-key', 'User API key used for all NerdGraph calls. Never logged.')

  .string('report-file')
  .describe('report-file', 'Path to write the markdown report to.')

  .demandOption(['environment', 'account-id', 'license-key', 'nerdgraph-api-key', 'report-file'])
  .argv
