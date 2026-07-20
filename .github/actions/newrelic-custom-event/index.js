import chalk from 'chalk'

const insertKey = process.env.NR_INSERT_KEY
const accountId = process.env.NR_ACCOUNT_ID
const eventType = process.env.NR_EVENT_TYPE
const attributesJson = process.env.NR_ATTRIBUTES

if (!insertKey) {
  throw new Error('NR_INSERT_KEY environment variable is required')
}
if (!accountId) {
  throw new Error('NR_ACCOUNT_ID environment variable is required')
}
if (!eventType) {
  throw new Error('NR_EVENT_TYPE environment variable is required')
}
if (!attributesJson) {
  throw new Error('NR_ATTRIBUTES environment variable is required')
}

const attributes = JSON.parse(attributesJson)
const event = { eventType, ...attributes }

const response = await fetch(`https://insights-collector.newrelic.com/v1/accounts/${accountId}/events`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Insert-Key': insertKey
  },
  body: JSON.stringify(event)
})

if (!response.ok) {
  const body = await response.text()
  throw new Error(`New Relic event publish failed (${response.status}): ${body}`)
}

console.log(chalk.green(`Published ${eventType} event to New Relic account ${accountId}`))
