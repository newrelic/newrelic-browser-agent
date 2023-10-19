import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('stage-api-key')
  .describe('stage-api-key', 'API key to use for talking to staging RPM site to upload loaders')

  .demandOption(['stage-api-key'])
  .argv
