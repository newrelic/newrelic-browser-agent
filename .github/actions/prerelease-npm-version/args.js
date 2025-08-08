import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('preid')
  .describe('preid', 'The preid to use for the pre-release version')
  .default('preid', 'rc')

  .string('version-override')
  .describe('version-override', 'A version to use instead of the current package version')

  .demandOption(['preid'])
  .argv
