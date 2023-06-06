import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('githubToken')
  .describe('githubToken', 'Github authentication token')

  .string('runId')
  .default('runId', process.env['GITHUB_RUN_ID'])
  .describe('runId', 'The id of the workflow run to get stats about')

  .argv
