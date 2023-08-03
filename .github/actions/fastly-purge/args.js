import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('service')
  .describe('service', 'Name of the fastly service to perform the purge on.')

  .array('purge-path')
  .describe('purge-path', 'Path(s) to purge in fastly.')

  .demandOption(['service', 'purge-path'])
  .argv
