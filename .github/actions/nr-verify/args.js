import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .choices('environment', ['stage', 'prod'])
  .array('environment')
  .describe('environment', 'NR environment to verify the loaders in. You can specify multiple by passing the argument more than once or providing a space delimited list.')
  .default('environment', ['stage', 'prod'])

  .string('loader-version')
  .describe('loader-version', 'Browser Agent version number')

  .string('manifest')
  .describe('manifest', 'Path to an integrity manifest. When provided, the loader content stored in NR must match the sha384 recorded for it, not just exist.')

  .demandOption(['environment', 'loader-version'])
  .argv
