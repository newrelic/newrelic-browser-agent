import process from 'node:process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('notifications-channel-url')
  .describe('notifications-channel-url', 'Webhook URL to slack #browser-agent-notifications')
  .default('notifications-channel-url', '')

  .string('dem-platform-ops-channel-url')
  .describe('dem-platform-ops-channel-url', 'Webhook URL to slack #dem-platform-ops')
  .default('dem-platform-ops-channel-url', '')

  .string('message')
  .describe('message', 'The message to post to Slack channels')
  .demandOption('message', 'Message is required')

  .argv
