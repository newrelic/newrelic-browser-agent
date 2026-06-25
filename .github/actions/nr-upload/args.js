import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .choices('environment', ['stage', 'prod'])
  .array('environment')
  .describe('environment', 'NR environment to upload the loaders to. You can specify multiple by passing the argument more than once or providing a space delimited list.')
  .default('environment', ['stage', 'prod'])

  .string('prod-api-key')
  .describe('prod-api-key', 'API key to use for talking to production RPM site to upload loaders')

  .string('stage-api-key')
  .describe('stage-api-key', 'API key to use for talking to staging RPM site to upload loaders')

  .string('loader-version')
  .describe('loader-version', 'Browser Agent version number')

  .string('local-dir')
  .describe('local-dir', 'Local directory to read loader files from instead of fetching from CDN')

  .demandOption(['environment'])
  .check((argv) => {
    if (!argv.loaderVersion && !argv.localDir) {
      throw new Error('Cannot upload loaders without a loader version or local directory.')
    }
    if (argv.environment.includes('stage') && !argv.stageApiKey) {
      throw new Error('Cannot upload to stage environment without api key.')
    }
    if (argv.environment.includes('prod') && !argv.prodApiKey) {
      throw new Error('Cannot upload to prod environment without api key.')
    }

    return true
  })
  .argv
