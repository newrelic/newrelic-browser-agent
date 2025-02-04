import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('version-type')
  .describe('version-type', 'Version bump type')

  .string('preid')
  .describe('preid', 'Prerelease identifier')

  .demandOption(['version-type'])

  .argv
