import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .number('prNumber')
  .describe('prRequired', 'Flag indicating if action should fail when a pull request is not found')

  .string('githubToken')
  .describe('githubToken', 'Github authentication token')

  .demandOption(['prNumber', 'githubToken'])

  .argv
