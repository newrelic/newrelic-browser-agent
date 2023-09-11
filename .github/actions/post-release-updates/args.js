import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .boolean('openPullRequest')
  .describe('openPullRequest', 'Flags the action to create a new pull request with the updates')
  .default('openPullRequest', false)

  .string('githubLogin')
  .describe('githubLogin', 'Github login associated with github authentication token')

  .string('githubToken')
  .describe('githubToken', 'Github authentication token')

  .string('githubUserName')
  .describe('githubUserName', 'User name associated with github login user')
  .default('githubUserName', 'Browser Agent Team')

  .string('githubEmail')
  .describe('githubEmail', 'Email address associated with github login user')

  .check((argv) => {
    if (argv.openPullRequest && (!argv.githubLogin || !argv.githubToken || !argv.githubUserName || !argv.githubEmail)) {
      throw new Error('Cannot create pull request without GitHub login, token, user name, and email address.')
    }

    return true
  })
  .argv
