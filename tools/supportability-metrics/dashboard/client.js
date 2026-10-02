/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A small NerdGraph client for the dashboard operations this project needs. It uses the global `fetch` (Node 18+) and takes it as an
 * argument so tests can supply a fake, so it has no dependencies.
 */

const { quote } = require('./nrql')

const VALIDATION_BATCH_SIZE = 15

/**
 * The time range added to a query that has none when it is validated. Most charts step by 1 hour (Angler writes one event per hour), and New
 * Relic rejects a step that is larger than the time range, so the range must be comfortably longer than an hour.
 */
const VALIDATION_WINDOW = 'SINCE 3 hours ago'

/**
 * @typedef {Object} NerdGraphClient
 * @property {function(string, Object=): Promise<Object>} request Runs a GraphQL document and returns its `data`, or throws with the errors.
 * @property {function(string): string} dashboardUrl A link to a dashboard from its guid.
 */

/**
 * @param {{graphqlUrl: string, oneUrl: string}} environment
 * @param {string} apiKey A New Relic user API key.
 * @param {typeof fetch} [fetchImplementation]
 * @returns {NerdGraphClient}
 */
function createClient (environment, apiKey, fetchImplementation = fetch) {
  return {
    async request (query, variables = {}) {
      const response = await fetchImplementation(environment.graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'API-Key': apiKey },
        body: JSON.stringify({ query, variables })
      })
      if (!response.ok) throw new Error(`NerdGraph answered ${response.status} ${response.statusText || ''}`.trim())
      const body = await response.json()
      if (body.errors?.length) throw new Error('NerdGraph error: ' + body.errors.map(error => error.message).join('; '))
      return body.data
    },
    dashboardUrl: (guid) => `${environment.oneUrl}/dashboards/detail/${guid}`
  }
}

/**
 * @param {Array<{description: string, type?: string}> | null | undefined} errors The `errors` of a dashboard mutation.
 * @param {string} action What was being done, for the message.
 */
function throwIfErrors (errors, action) {
  const describe = (error) => error.type ? error.description + ' (' + error.type + ')' : error.description
  if (errors?.length) throw new Error(`Could not ${action}: ` + errors.map(describe).join('; '))
}

/**
 * Finds a dashboard by its exact name in an account.
 * @param {NerdGraphClient} client
 * @param {{accountId: number, name: string}} query `accountId` is the account the dashboard lives in.
 * @returns {Promise<{guid: string, name: string} | undefined>}
 */
async function findDashboard (client, { accountId, name }) {
  const search = `domain = 'VIZ' AND type = 'DASHBOARD' AND accountId = ${accountId} AND name = ${quote(name)}`
  const data = await client.request(
    'query ($query: String!) { actor { entitySearch(query: $query) { results { entities { guid name } } } } }',
    { query: search }
  )
  return (data.actor.entitySearch.results.entities || []).find(entity => entity.name === name)
}

/**
 * Creates the dashboard, or replaces the existing one with the same name. The dashboard is fully owned by this tool, so it is replaced whole.
 * @param {NerdGraphClient} client
 * @param {{accountId: number, dashboard: Object}} options `accountId` is the account to create the dashboard in, which need not be the one its queries read.
 * @returns {Promise<{guid: string, url: string, created: boolean}>}
 */
async function upsertDashboard (client, { accountId, dashboard }) {
  const existing = await findDashboard(client, { accountId, name: dashboard.name })
  if (existing) {
    const data = await client.request(
      'mutation ($guid: EntityGuid!, $dashboard: DashboardInput!) { dashboardUpdate(guid: $guid, dashboard: $dashboard) { entityResult { guid name } errors { description type } } }',
      { guid: existing.guid, dashboard }
    )
    throwIfErrors(data.dashboardUpdate.errors, `update the dashboard "${dashboard.name}"`)
    return { guid: existing.guid, url: client.dashboardUrl(existing.guid), created: false }
  }
  const data = await client.request(
    'mutation ($accountId: Int!, $dashboard: DashboardInput!) { dashboardCreate(accountId: $accountId, dashboard: $dashboard) { entityResult { guid name } errors { description type } } }',
    { accountId, dashboard }
  )
  throwIfErrors(data.dashboardCreate.errors, `create the dashboard "${dashboard.name}"`)
  const guid = data.dashboardCreate.entityResult.guid
  return { guid, url: client.dashboardUrl(guid), created: true }
}

/**
 * Deletes the dashboard with this name, if there is one.
 * @param {NerdGraphClient} client
 * @param {{accountId: number, name: string}} query
 * @returns {Promise<boolean>} Whether a dashboard was deleted.
 */
async function deleteDashboard (client, { accountId, name }) {
  const existing = await findDashboard(client, { accountId, name })
  if (!existing) return false
  const data = await client.request(
    'mutation ($guid: EntityGuid!) { dashboardDelete(guid: $guid) { status errors { description type } } }',
    { guid: existing.guid }
  )
  throwIfErrors(data.dashboardDelete.errors, `delete the dashboard "${name}"`)
  return true
}

/**
 * @param {Object} dashboard
 * @returns {Array<{account: number, query: string}>} Every distinct NRQL query the dashboard runs, and the account it runs in.
 */
function listQueries (dashboard) {
  const found = new Map()
  const add = (accountIds, query) => (accountIds || []).forEach(account => found.set(`${account}:${query}`, { account, query }))
  dashboard.pages.forEach(page => page.widgets.forEach(widget => (widget.rawConfiguration.nrqlQueries || []).forEach(({ accountIds, query }) => add(accountIds, query))))
  dashboard.variables.forEach(variable => { if (variable.nrqlQuery) add(variable.nrqlQuery.accountIds, variable.nrqlQuery.query) })
  return [...found.values()]
}

/**
 * Runs every query the dashboard contains against New Relic, so a mistake in the generated NRQL is caught before the dashboard is applied.
 * Dashboard variables are replaced with a sample value, and a short time range is added to queries that have none (see VALIDATION_WINDOW).
 * @param {NerdGraphClient} client
 * @param {Object} dashboard
 * @returns {Promise<Array<{query: string, error: string}>>} The queries that failed. Empty when all of them are valid.
 */
async function validateQueries (client, dashboard) {
  const sample = (query) => query.replace(/\{\{[a-z_]+\}\}/g, quote('Browser/Supportability/Session/RaceCondition/Seen')).replace(/\s+$/, '')
  const runnable = listQueries(dashboard).map(({ account, query }) => ({ account, query, run: /\bSINCE\b/i.test(query) ? sample(query) : `${sample(query)} ${VALIDATION_WINDOW}` }))
  const failures = []
  const byAccount = runnable.reduce((groups, item) => ({ ...groups, [item.account]: [...(groups[item.account] || []), item] }), {})

  for (const [account, items] of Object.entries(byAccount)) {
    for (let start = 0; start < items.length; start += VALIDATION_BATCH_SIZE) {
      const batch = items.slice(start, start + VALIDATION_BATCH_SIZE)
      const names = batch.map((_, i) => `q${i}`)
      const declarations = names.map(name => '$' + name + ': Nrql!').join(', ')
      const selections = names.map(name => name + ': nrql(query: $' + name + ') { results }').join(' ')
      const document = `query ($account: Int!, ${declarations}) { actor { account(id: $account) { ${selections} } } }`
      const variables = Object.fromEntries([['account', Number(account)], ...batch.map((item, i) => [names[i], item.run])])
      try {
        await client.request(document, variables)
      } catch (error) {
        // One bad query fails the whole batch, so run them one at a time to say which
        for (const item of batch) {
          try {
            await client.request('query ($account: Int!, $q: Nrql!) { actor { account(id: $account) { nrql(query: $q) { results } } } }', { account: Number(account), q: item.run })
          } catch (singleError) {
            failures.push({ query: item.query, error: singleError.message })
          }
        }
      }
    }
  }
  return failures
}

module.exports = { createClient, findDashboard, upsertDashboard, deleteDashboard, listQueries, validateQueries, VALIDATION_BATCH_SIZE, VALIDATION_WINDOW }
