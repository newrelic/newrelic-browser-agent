import { args } from './args.js'
import chalk from 'chalk'

const slackPayload = process.env.SLACK_PAYLOAD
if (!slackPayload) {
  throw new Error('SLACK_PAYLOAD environment variable is required')
}

const { text, blocks } = JSON.parse(slackPayload)

const dashboardUrl = process.env.SLACK_DASHBOARD_URL
if (dashboardUrl) {
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `📊 <${dashboardUrl}|View live metrics dashboard>` }
  })
}

const imageUrl = process.env.SLACK_IMAGE_URL

const channels = [
  args.notificationsChannelUrl,
  args.demPlatformOpsChannelUrl,
  args.browserAgentDevChannelUrl
].filter(url => !!url)

async function postToSlack (channel, body) {
  const notificationRequest = await fetch(channel, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!notificationRequest.ok) {
    const responseText = await notificationRequest.text()
    throw new Error(`Notification failed for channel ${channel} (${notificationRequest.status}): ${responseText}`)
  }
}

for (const channel of channels) {
  try {
    await postToSlack(channel, { text, blocks })
    console.log(chalk.green('Successfully notified channel ' + channel))
  } catch (error) {
    console.log(chalk.red(`Failed to post payload to ${channel}: ${error.message}`))
    continue
  }

  // Post the dashboard snapshot as a follow-up message so a bad/unreachable
  // image URL can't fail (or take down) the primary notification above.
  if (imageUrl) {
    try {
      await postToSlack(channel, {
        text: 'Metrics dashboard snapshot',
        blocks: [{
          type: 'image',
          title: { type: 'plain_text', text: '📊 Metrics Dashboard' },
          image_url: imageUrl,
          alt_text: 'Daily Dispatch metrics dashboard snapshot'
        }]
      })
      console.log(chalk.green('Successfully posted dashboard snapshot to channel ' + channel))
    } catch (error) {
      console.log(chalk.red(`Failed to post dashboard snapshot to ${channel}: ${error.message}`))
    }
  }
}
