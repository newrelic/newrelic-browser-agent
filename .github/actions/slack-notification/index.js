import { args } from './args.js'
import chalk from 'chalk'

async function postToSlack (text) {
  const channels = [
    args.notificationsChannelUrl,
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
        throw new Error('Notification failed for channel ' + channel)
      }

      console.log(chalk.green('Successfully notified channel ' + channel))
    } catch (error) {
      console.log(chalk.red(`Failed to post ${text} to ` + channel))
    }
  }
}

await postToSlack(args.message)
