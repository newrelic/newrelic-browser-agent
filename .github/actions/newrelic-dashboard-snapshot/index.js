import { appendFileSync } from 'node:fs'
import chalk from 'chalk'

const apiKey = process.env.NR_API_KEY
const dashboardGuid = process.env.NR_DASHBOARD_GUID
const width = process.env.NR_SNAPSHOT_WIDTH
const height = process.env.NR_SNAPSHOT_HEIGHT
const delaySeconds = Number(process.env.NR_SNAPSHOT_DELAY_SECONDS ?? '30')

if (!apiKey) {
  throw new Error('NR_API_KEY environment variable is required')
}
if (!dashboardGuid) {
  throw new Error('NR_DASHBOARD_GUID environment variable is required')
}

console.log(`Waiting ${delaySeconds}s for recently published data to be synthesized into the dashboard...`)
await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000))

const mutation = `
  mutation {
    dashboardCreateSnapshotUrl(
      guid: "${dashboardGuid}"
      params: {display: {height: ${height}, width: ${width}}, format: PNG}
    )
  }
`

const response = await fetch('https://staging-api.newrelic.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'API-Key': apiKey
  },
  body: JSON.stringify({ query: mutation })
})

const rawBody = await response.text()

let body
try {
  body = JSON.parse(rawBody)
} catch {
  throw new Error(`Dashboard snapshot request failed (${response.status}): ${rawBody}`)
}

if (!response.ok || body.errors) {
  throw new Error(`Dashboard snapshot request failed (${response.status}): ${JSON.stringify(body.errors ?? body)}`)
}

const snapshotUrl = body.data?.dashboardCreateSnapshotUrl
if (!snapshotUrl) {
  throw new Error(`No snapshot URL returned: ${JSON.stringify(body)}`)
}

console.log(chalk.green(`Generated dashboard snapshot: ${snapshotUrl}`))

const githubOutput = process.env.GITHUB_OUTPUT
if (githubOutput) {
  appendFileSync(githubOutput, `snapshot_url<<EOF\n${snapshotUrl}\nEOF\n`)
} else {
  console.log(snapshotUrl)
}
