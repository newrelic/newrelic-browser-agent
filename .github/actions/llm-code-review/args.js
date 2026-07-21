import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('github-token')
  .describe('github-token', 'GitHub token used to fetch the pull request diff')

  .string('pr-number')
  .describe('pr-number', 'Pull request number to review')

  .string('nc-base-url')
  .describe('nc-base-url', 'Base URL of the Nerd Completion gateway')

  .string('nc-api-token')
  .describe('nc-api-token', 'Bearer token used to authenticate with Nerd Completion')

  .string('nc-model')
  .describe('nc-model', 'Model alias to request from Nerd Completion')

  .demandOption(['github-token', 'pr-number', 'nc-base-url', 'nc-api-token', 'nc-model'])
  .argv
