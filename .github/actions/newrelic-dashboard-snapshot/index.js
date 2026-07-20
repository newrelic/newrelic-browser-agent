import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
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

// The snapshot renders on first access, so retry a few times until it's actually an image -
// the mutation returning a URL doesn't guarantee the PNG behind it is ready yet.
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const snapshotPath = process.env.NR_SNAPSHOT_OUTPUT_PATH || `./slack-dashboard-image/${timestamp}.png`
const maxAttempts = 5
let imageBuffer

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const imageResponse = await fetch(snapshotUrl)
  const contentType = imageResponse.headers.get('content-type') ?? ''

  if (imageResponse.ok && contentType.startsWith('image/')) {
    imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    break
  }

  console.log(`Snapshot not ready yet (attempt ${attempt}/${maxAttempts}, status ${imageResponse.status}, content-type ${contentType})`)
  if (attempt < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}

if (!imageBuffer) {
  throw new Error(`Snapshot image never became available at ${snapshotUrl}`)
}

mkdirSync(dirname(snapshotPath), { recursive: true })
writeFileSync(snapshotPath, imageBuffer)
console.log(chalk.green(`Saved dashboard snapshot image to ${snapshotPath}`))

const githubOutput = process.env.GITHUB_OUTPUT
if (githubOutput) {
  appendFileSync(githubOutput, `snapshot_url<<EOF\n${snapshotUrl}\nEOF\n`)
  appendFileSync(githubOutput, `snapshot_path<<EOF\n${snapshotPath}\nEOF\n`)
  appendFileSync(githubOutput, `snapshot_dir<<EOF\n${dirname(snapshotPath)}\nEOF\n`)
} else {
  console.log(snapshotUrl)
  console.log(snapshotPath)
}
