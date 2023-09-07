import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('service')
  .describe('service', 'Name of the fastly service to verify the asset(s) in.')

  .array('asset-path')
  .describe('asset-path', 'Path(s) to verfy in fastly.')

  .demandOption(['service', 'asset-path'])
  .argv
