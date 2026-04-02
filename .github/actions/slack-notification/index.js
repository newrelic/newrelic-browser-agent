import { args } from './args.js'
import chalk from 'chalk'

async function postToSlack (text) {
  const channels = [
    args.devChannelUrl,
    args.demPlatformOpsChannelUrl,
  ].filter(url => !!url)

  for (const channel of channels) {
    try {
      const notificationRequest = await fetch(channel, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      })

      if (!notificationRequest.ok) {
        throw new Error('Notification failed')
      }

      console.log(chalk.green('Notified Slack Channel'))
    } catch (error) {
      console.log(chalk.red(`Failed to post ${text} to Slack`))
    }
  }
}

await postToSlack(args.message)
