import { args } from './args.js'
import chalk from 'chalk'

const slackPayload = process.env.SLACK_PAYLOAD
if (!slackPayload) {
  throw new Error('SLACK_PAYLOAD environment variable is required')
}

const { text, blocks } = JSON.parse(slackPayload)

async function postToSlack (body) {
  const channels = [
    args.notificationsChannelUrl,
    args.demPlatformOpsChannelUrl,
    args.browserAgentDevChannelUrl
  ].filter(url => !!url)

  for (const channel of channels) {
    try {
      const notificationRequest = await fetch(channel, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!notificationRequest.ok) {
        throw new Error('Notification failed for channel ' + channel)
      }

      console.log(chalk.green('Successfully notified channel ' + channel))
    } catch (error) {
      console.log(chalk.red(`Failed to post payload to ` + channel))
    }
  }
}

await postToSlack({ text, blocks })
