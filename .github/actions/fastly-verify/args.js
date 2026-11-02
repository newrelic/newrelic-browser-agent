import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('service')
  .describe('service', 'Name of the fastly service to verify the asset(s) in.')

  .array('asset-path')
  .describe('asset-path', 'Path(s) to verfy in fastly.')

  .string('manifest')
  .describe('manifest', 'Path to an integrity manifest. When provided, the content served by fastly must match the sha384 recorded for each asset.')

  .demandOption(['service', 'asset-path'])
  .argv
