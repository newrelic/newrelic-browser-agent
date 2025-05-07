import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .choices('version-type', ['major','minor','patch','premajor','preminor','prepatch','prerelease','from-git'])
  .string('version-type')
  .describe('version-type', 'The version bump type to apply to the NPM package')
  .default('version-type', 'preminor')

  .string('preid')
  .describe('preid', 'The preid to use for the pre-release version')
  .default('preid', 'rc')

  .string('current-version')
  .describe('current-version', 'The current version of the NPM package')
  .default('current-version', '0.0.0')

  .demandOption(['version-type', 'preid'])
  .argv
