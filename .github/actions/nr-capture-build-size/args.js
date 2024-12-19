import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('branch-name')
  .describe('branch-name', 'Previous branch name')

  .string('nr-api-key')
  .describe('nr-api-key', 'NR API key for uploading custom events')

  .demandOption(['branch-name', 'nr-api-key'])
  .argv
