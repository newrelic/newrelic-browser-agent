import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .choices('environment', ['stage', 'prod'])
  .array('environment')
  .describe('environment', 'NR environment to verify the loaders in. You can specify multiple by passing the argument more than once or providing a space delimited list.')
  .default('environment', ['stage', 'prod'])

  .string('prod-api-key')
  .describe('prod-api-key', 'API key to use for talking to production RPM site to read loaders')

  .string('stage-api-key')
  .describe('stage-api-key', 'API key to use for talking to staging RPM site to read loaders')

  .string('loader-version')
  .describe('loader-version', 'Browser Agent version number')

  .string('manifest')
  .describe('manifest', 'Path to an integrity manifest. When provided, the loader content stored in NR must match the sha384 recorded for it, not just exist.')

  .demandOption(['environment', 'loader-version'])
  .check((argv) => {
    if (argv.environment.includes('stage') && !argv.stageApiKey) {
      throw new Error('Cannot verify the stage environment without api key.')
    }
    if (argv.environment.includes('prod') && !argv.prodApiKey) {
      throw new Error('Cannot verify the prod environment without api key.')
    }

    return true
  })
  .argv
