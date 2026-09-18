import { appendFileSync } from 'node:fs'
import { gql, GraphQLClient } from 'graphql-request'
import chalk from 'chalk'

const apiKey = process.env.NR_API_KEY
const accountId = process.env.NR_ACCOUNT_ID
const entityGuid = process.env.NR_ENTITY_GUID
const envName = process.env.NR_ENV_NAME
const windowMinutes = Number(process.env.NR_WINDOW_MINUTES ?? '10')
const runUrl = process.env.NR_RUN_URL
const rollbackUrl = process.env.NR_ROLLBACK_URL

for (const [name, value] of Object.entries({ apiKey, accountId, entityGuid, envName, runUrl, rollbackUrl })) {
  if (!value) throw new Error(`Missing required input/env var for: ${name}`)
}

// NRDB event types the browser agent harvests as queryable rows (see src/common/constants/events.js,
// src/loaders/features/features.js). SessionTrace/SessionReplay are excluded - they land as blobs, not rows.
const EVENT_TYPES = [
  { alias: 'pageView', type: 'PageView' },
  { alias: 'pageViewTiming', type: 'PageViewTiming' },
  { alias: 'ajaxRequest', type: 'AjaxRequest' },
  { alias: 'browserInteraction', type: 'BrowserInteraction' },
  { alias: 'javaScriptError', type: 'JavaScriptError' },
  { alias: 'pageAction', type: 'PageAction' },
  { alias: 'userAction', type: 'UserAction' },
  { alias: 'browserPerformance', type: 'BrowserPerformance' },
  { alias: 'webSocket', type: 'WebSocket' },
  { alias: 'securityPolicyViolation', type: 'SecurityPolicyViolation' },
  { alias: 'log', type: 'Log' }
]

// A stream with no meaningful before-window signal has nothing to compare against; treat this as
// the floor below which mean/stddev are just noise, so a jump from ~0 to a real rate is still caught
// (afterMean >= EPSILON) without a division-by-near-zero blowing up the z-score for quiet streams.
const EPSILON = 0.5

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function stddev(values, avg) {
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function evaluate(beforeCounts, afterCounts) {
  const beforeMean = mean(beforeCounts)
  const afterMean = mean(afterCounts)
  const beforeStd = stddev(beforeCounts, beforeMean)

  if (beforeMean < EPSILON && beforeStd < EPSILON) {
    return { beforeMean, afterMean, significant: afterMean >= EPSILON }
  }

  const std = Math.max(beforeStd, EPSILON)
  const significant = afterMean < beforeMean - 2 * std || afterMean > beforeMean + 2 * std
  return { beforeMean, afterMean, significant }
}

async function run() {
  const deployTime = Date.now()
  const beforeStart = deployTime - windowMinutes * 60 * 1000
  const afterEnd = deployTime + windowMinutes * 60 * 1000
  const ingestionBufferMs = 60 * 1000
  const waitMs = afterEnd + ingestionBufferMs - Date.now()

  if (waitMs > 0) {
    console.log(`Waiting ${Math.round(waitMs / 1000)}s for the post-deploy window to elapse and data to ingest...`)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  const nrqlFields = EVENT_TYPES.map(({ alias, type }) => `
    ${alias}: nrql(query: "SELECT count(*) FROM ${type} WHERE entityGuid = '${entityGuid}' SINCE ${beforeStart} UNTIL ${afterEnd} TIMESERIES 1 minute") {
      results
    }`).join('\n')

  const query = gql`
    {
      actor {
        account(id: ${accountId}) {
          ${nrqlFields}
        }
      }
    }
  `

  const client = new GraphQLClient('https://staging-api.newrelic.com/graphql', {
    headers: { 'API-Key': apiKey }
  })

  const response = await client.request(query)
  const account = response.actor.account

  const evaluations = EVENT_TYPES.map(({ alias, type }) => {
    const buckets = account[alias].results ?? []
    const midpoint = Math.floor(buckets.length / 2)
    const beforeCounts = buckets.slice(0, midpoint).map((b) => b.count ?? 0)
    const afterCounts = buckets.slice(midpoint).map((b) => b.count ?? 0)

    if (beforeCounts.length === 0 || afterCounts.length === 0) {
      console.log(chalk.yellow(`No data returned for ${type}, skipping`))
      return { type, significant: false, beforeMean: 0, afterMean: 0, skipped: true }
    }

    const result = evaluate(beforeCounts, afterCounts)
    console.log(`${type}: before=${result.beforeMean.toFixed(2)}/min after=${result.afterMean.toFixed(2)}/min significant=${result.significant}`)
    return { type, ...result }
  })

  const flagged = evaluations.filter((e) => e.significant)
  const regressionDetected = flagged.length > 0

  const headerText = regressionDetected
    ? `⚠️ *${envName}* promoted — statistically significant change in: ${flagged.map((f) => f.type).join(', ')}`
    : `✅ *${envName}* promoted — all ${evaluations.length} monitored event types normal`

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: headerText } }
  ]

  if (regressionDetected) {
    const detailLines = flagged
      .map((f) => `• *${f.type}*: ${f.beforeMean.toFixed(1)}/min → ${f.afterMean.toFixed(1)}/min (before → after)`)
      .join('\n')
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: detailLines } })
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Continue Promotion' },
        style: 'primary',
        url: runUrl
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Rollback' },
        style: 'danger',
        url: rollbackUrl
      }
    ]
  })

  const slackPayload = {
    text: headerText.replace(/\*/g, ''),
    blocks
  }

  console.log(chalk.green(regressionDetected ? 'Regression flagged - see Slack payload below' : 'No regression detected'))

  const githubOutput = process.env.GITHUB_OUTPUT
  if (githubOutput) {
    appendFileSync(githubOutput, `regression_detected=${regressionDetected}\n`)
    appendFileSync(githubOutput, `slack_payload<<EOF\n${JSON.stringify(slackPayload)}\nEOF\n`)
  } else {
    console.log(regressionDetected)
    console.log(JSON.stringify(slackPayload))
  }
}

run().catch((error) => {
  console.error(chalk.red('NRQL health check failed:'))
  console.error(error.message)
  if (error.response) {
    console.error(JSON.stringify(error.response.errors, null, 2))
  }
  // Never fail the job over this - it's informational only and must not block the promotion pipeline.
  const githubOutput = process.env.GITHUB_OUTPUT
  if (githubOutput) {
    appendFileSync(githubOutput, 'regression_detected=false\n')
    appendFileSync(githubOutput, `slack_payload<<EOF\n${JSON.stringify({ text: `⚠️ Health check for ${envName} failed to run: ${error.message}`, blocks: [] })}\nEOF\n`)
  }
})
