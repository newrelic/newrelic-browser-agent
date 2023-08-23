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

  .demandOption(['environment', 'loader-version'])
  .argv
