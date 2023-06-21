import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .boolean('prRequired')
  .default('prRequired', false)
  .describe('prRequired', 'Flag indicating if action should fail when a pull request is not found')

  .string('githubToken')
  .describe('githubToken', 'Github authentication token')

  .string('githubRef')
  .default('githubRef', process.env['GITHUB_REF'])
  .describe('githubRef', 'The branch ref to use')

  .demandOption(['githubToken'])
  .argv
