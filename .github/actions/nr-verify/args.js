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

  .string('local-dir')
  .describe('local-dir', 'Local directory to inspect for loader filenames instead of deriving them from a version')

  .boolean('fuzzy-only')
  .default('fuzzy-only', false)
  .describe('fuzzy-only', 'Only verify patch and minor fuzzy versions')

  .demandOption(['environment'])
  .check((argv) => {
    if (!argv.loaderVersion && !argv.localDir) {
      throw new Error('Cannot verify loaders without a loader version or local directory.')
    }
    if (argv.fuzzyOnly && !argv.loaderVersion) {
      throw new Error('Cannot use fuzzy-only mode without a loader version.')
    }

    return true
  })
  .argv
