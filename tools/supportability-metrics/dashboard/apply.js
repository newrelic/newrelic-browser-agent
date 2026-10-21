/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Creates, updates or deletes the generated supportability dashboard in New Relic.
 *
 *   node tools/supportability-metrics/dashboard/apply.js --env staging|us-prod [--name "Dashboard name" | --pr 123] [--validate] [--dry-run] [--delete] [--write-json file]
 *
 * - The API key is read from the environment variable named by the environment (NR_API_KEY_STAGING or NR_API_KEY_PRODUCTION).
 * - `--pr 123` names the dashboard as the preview for pull request 123 (and is what to use to delete it).
 * - `--validate` runs every query against New Relic first and stops if any is invalid.
 * - `--dry-run` builds the dashboard (and validates it, if asked) but creates nothing. `--write-json` saves it to a file you can import by hand.
 * - `--delete` deletes the dashboard with that name instead.
 * - When run by GitHub Actions it writes `dashboard_url` to the step's output.
 */

const fs = require('fs')
const { ENVIRONMENTS } = require('./environments')
const { buildDashboard } = require('./generate')
const { createClient, upsertDashboard, deleteDashboard, validateQueries } = require('./client')

const DEFAULT_NAME = 'Browser Agent Supportability Metrics (generated)'

/** @param {number | string} pullRequest @returns {string} The name of the preview dashboard for a pull request. Creating and deleting it must agree on this. */
const previewName = (pullRequest) => `[PR #${pullRequest}] Browser Agent Supportability Metrics (preview)`

/**
 * @param {string[]} argv
 * @returns {{env?: string, name: string, validate: boolean, dryRun: boolean, remove: boolean, writeJson?: string}}
 */
function parseArguments (argv) {
  const valueOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }
  return {
    env: valueOf('--env'),
    name: valueOf('--pr') ? previewName(valueOf('--pr')) : valueOf('--name') || DEFAULT_NAME,
    validate: argv.includes('--validate'),
    dryRun: argv.includes('--dry-run'),
    remove: argv.includes('--delete'),
    writeJson: valueOf('--write-json')
  }
}

/** How many example queries to show for each distinct error. */
const EXAMPLES_PER_ERROR = 3

/**
 * Groups failed queries by their error, so one cause that affects many queries is reported once with a few examples.
 * @param {Array<{query: string, error: string}>} failures
 * @returns {string}
 */
function describeFailures (failures) {
  const byError = failures.reduce((groups, { query, error }) => groups.set(error, [...(groups.get(error) || []), query]), new Map())
  return [...byError].map(([error, queries]) => {
    const examples = queries.slice(0, EXAMPLES_PER_ERROR).map(query => `    ${query}`).join('\n')
    const more = queries.length > EXAMPLES_PER_ERROR ? `\n    ... and ${queries.length - EXAMPLES_PER_ERROR} more` : ''
    return `${queries.length} ${queries.length === 1 ? 'query' : 'queries'} failed with: ${error}\n${examples}${more}`
  }).join('\n\n')
}

/**
 * Does what the arguments ask. Everything it touches outside of the arguments is passed in, so it can be tested.
 * @param {ReturnType<typeof parseArguments>} args
 * @param {{env: Object<string, string | undefined>, registry: Object, log: function(string): void, fetchImplementation?: typeof fetch, writeFile?: function(string, string): void}} dependencies
 * @returns {Promise<{url?: string, action: string}>}
 */
async function run (args, { env, registry, log, fetchImplementation, writeFile = fs.writeFileSync }) {
  const environment = ENVIRONMENTS[args.env]
  if (!environment) throw new Error(`Unknown --env "${args.env}". Use one of: ${Object.keys(ENVIRONMENTS).join(', ')}.`)

  const dashboard = buildDashboard(registry, { dataAccountId: environment.dataAccountId, name: args.name })
  const widgetCount = dashboard.pages.reduce((total, page) => total + page.widgets.length, 0)
  log(`Built "${dashboard.name}" for ${environment.label} (reads account ${environment.dataAccountId}, lives in account ${environment.dashboardAccountId}): ${dashboard.pages.length} pages, ${widgetCount} widgets.`)
  if (args.writeJson) {
    writeFile(args.writeJson, JSON.stringify(dashboard, null, 2))
    log(`Wrote ${args.writeJson}`)
  }

  const apiKey = env[environment.apiKeyVariable]
  const needsApi = args.remove || args.validate || !args.dryRun
  if (needsApi && !apiKey) throw new Error(`The ${environment.apiKeyVariable} environment variable is not set. It must hold a New Relic user API key with dashboard write access.`)
  const client = needsApi ? createClient(environment, apiKey, fetchImplementation) : undefined

  if (args.remove) {
    if (args.dryRun) return { action: 'would delete' }
    const deleted = await deleteDashboard(client, { accountId: environment.dashboardAccountId, name: args.name })
    log(deleted ? `Deleted "${args.name}".` : `There was no dashboard named "${args.name}" to delete.`)
    return { action: deleted ? 'deleted' : 'nothing to delete' }
  }

  if (args.validate) {
    const failures = await validateQueries(client, dashboard)
    if (failures.length) {
      log(describeFailures(failures))
      throw new Error(`${failures.length} generated ${failures.length === 1 ? 'query is' : 'queries are'} not valid NRQL, so the dashboard was not applied.`)
    }
    log('Every generated query ran successfully.')
  }
  if (args.dryRun) return { action: 'dry run' }

  const result = await upsertDashboard(client, { accountId: environment.dashboardAccountId, dashboard })
  log(`${result.created ? 'Created' : 'Updated'} "${dashboard.name}": ${result.url}`)
  return { url: result.url, action: result.created ? 'created' : 'updated' }
}

module.exports = { run, parseArguments, describeFailures, DEFAULT_NAME, previewName }

if (require.main === module) {
  run(parseArguments(process.argv.slice(2)), { env: process.env, registry: require('../registry'), log: console.log })
    .then(({ url }) => {
      if (url && process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `dashboard_url=${url}\n`)
    })
    .catch(error => {
      console.error(error.message)
      process.exit(1)
    })
}
