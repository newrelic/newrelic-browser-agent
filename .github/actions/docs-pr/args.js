import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('tag')
  .describe('tag', 'Name of the tag to pull the release information for.')

  .string('githubLogin')
  .describe('githubLogin', 'Github login associated with github authentication token')

  .string('githubUserName')
  .describe('githubUserName', 'User name associated with github login user')
  .default('githubUserName', 'Browser Agent Team')

  .string('githubEmail')
  .describe('githubEmail', 'Email address associated with github login user')

  .string('nrDocsGithubToken')
  .describe('nrDocsGithubToken', 'New Relic github org authentication token scoped to the docs repo')

  .demandOption(['tag', 'githubLogin', 'githubUserName', 'githubEmail', 'nrDocsGithubToken'])
  .argv
