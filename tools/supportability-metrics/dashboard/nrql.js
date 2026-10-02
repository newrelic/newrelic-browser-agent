/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Builds the NRQL for the generated dashboard. It only uses functions the hand-built supportability dashboard already relies on.
 *
 * Angler writes one `Supportability` event per hour, account, app and metric name, with these fields:
 * - `call_count`: how many times the metric was reported. It is already summed within the event, so the count is `sum(call_count)`.
 * - `total_call_time`: the sum of the values reported, so the average is `sum(total_call_time) / sum(call_count)`.
 * - `min_call_time` and `max_call_time`: the smallest and largest value in the event (not aggregated, so take `min()` and `max()` across events).
 * Metrics that report no value have `total_call_time`, `min_call_time` and `max_call_time` of 0.
 */

const { PREFIX } = require('../angler')

const EVENT = 'Supportability'

/** Strips `Browser/Supportability/` from a metric name so chart labels are short. */
const LABEL = `substring(name, ${PREFIX.length})`

/** @param {string} text @returns {string} The text as a single quoted NRQL string. */
const quote = (text) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** @param {import('../registry-types').RegistryEntry} entry @returns {boolean} Whether the tag has a placeholder. */
const hasPlaceholder = (entry) => /<[^>]*>/.test(entry.tag)

/**
 * The full name of each known value of a family, or just the tag for a single metric.
 * @param {import('../registry-types').RegistryEntry} entry
 * @param {string[]} [only] Restrict a family to these of its values.
 * @returns {string[]}
 */
function namesOf (entry, only) {
  if (!entry.values) return [PREFIX + entry.tag]
  return entry.values
    .map(value => Array.isArray(value) ? value[0] : value)
    .filter(value => !only || only.includes(value))
    .map(value => PREFIX + entry.tag.replace(/<[^>]*>/, value))
}

/**
 * Builds the condition that selects the metrics of some registry entries. A family is matched with a `LIKE` pattern (`API/%/called`), not
 * a list of names, so a name Angler starts to track later is picked up without regenerating the dashboard.
 * @param {import('../registry-types').RegistryEntry[]} entries
 * @param {{only?: Object<string, string[]>}} [options] `only` restricts the named entries (by tag) to a subset of their values, and matches by exact name.
 * @returns {string} A condition for a `WHERE` clause.
 */
function nameCondition (entries, { only = {} } = {}) {
  const exact = []
  const like = []
  entries.forEach(entry => {
    if (only[entry.tag]) exact.push(...namesOf(entry, only[entry.tag]))
    else if (hasPlaceholder(entry)) like.push(PREFIX + entry.tag.replace(/<[^>]*>/g, '%'))
    else exact.push(PREFIX + entry.tag)
  })
  const parts = []
  if (exact.length === 1) parts.push(`name = ${quote(exact[0])}`)
  else if (exact.length > 1) parts.push(`name IN (${exact.map(quote).join(', ')})`)
  like.forEach(pattern => parts.push(`name LIKE ${quote(pattern)}`))
  return parts.length > 1 ? `(${parts.join(' OR ')})` : parts[0]
}

const from = `FROM ${EVENT}`
/** A faceted query keeps 10 facets unless it says otherwise, so every one asks for all of them. */
const facetByMetric = (facet) => facet ? ` FACET ${LABEL}` : ''
const timeseries = (facet) => ` TIMESERIES 1 hour${facet ? ' LIMIT MAX' : ''}`

/** Query builders. Each takes the condition that selects the metrics. */
const queries = {
  /** The number of times the selected metrics were reported. */
  totalCalls: (condition) => `${from} SELECT sum(call_count) AS 'Calls' WHERE ${condition}`,
  /** How many distinct metric names, accounts and apps reported them. */
  metricsSeen: (condition) => `${from} SELECT uniqueCount(name) AS 'Metrics' WHERE ${condition}`,
  accountsReporting: (condition) => `${from} SELECT uniqueCount(account_id) AS 'Accounts' WHERE ${condition}`,
  appsReporting: (condition) => `${from} SELECT uniqueCount(agent_id) AS 'Apps' WHERE ${condition}`,
  /** The count over time, one line per metric. */
  countByMetric: (condition) => `${from} SELECT sum(call_count) WHERE ${condition} FACET ${LABEL} TIMESERIES 1 hour LIMIT MAX`,
  /** The total in the time range, one bar or slice per metric. */
  totalByMetric: (condition) => `${from} SELECT sum(call_count) WHERE ${condition} FACET ${LABEL} LIMIT MAX`,
  /** How many distinct accounts reported each metric. */
  accountsByMetric: (condition) => `${from} SELECT uniqueCount(account_id) AS 'Accounts' WHERE ${condition} FACET ${LABEL} LIMIT MAX`,
  /** How many distinct apps reported each metric. */
  appsByMetric: (condition) => `${from} SELECT uniqueCount(agent_id) AS 'Apps' WHERE ${condition} FACET ${LABEL} LIMIT MAX`,
  /** One row per metric with its count and how many accounts and apps reported it. */
  tableByMetric: (condition) => `${from} SELECT sum(call_count) AS 'Calls', uniqueCount(account_id) AS 'Accounts', uniqueCount(agent_id) AS 'Apps' WHERE ${condition} FACET ${LABEL} LIMIT MAX`,
  /** The count over time for one metric, as a single line. */
  count: (condition) => `${from} SELECT sum(call_count) AS 'Calls' WHERE ${condition} TIMESERIES 1 hour`,
  /** The count over time, one line per account. */
  countByAccount: (condition) => `${from} SELECT sum(call_count) WHERE ${condition} FACET account_id TIMESERIES 1 hour LIMIT MAX`,
  /** The count over time, one line per app. */
  countByApp: (condition) => `${from} SELECT sum(call_count) WHERE ${condition} FACET agent_id TIMESERIES 1 hour LIMIT MAX`,
  /** The average of the reported value, which is the sum of the values over the sum of the counts. */
  averageValue: (condition, unit, facet = true) => `${from} SELECT sum(total_call_time) / sum(call_count) AS 'Average (${unit})' WHERE ${condition}${facetByMetric(facet)}${timeseries(facet)}`,
  maximumValue: (condition, unit, facet = true) => `${from} SELECT max(max_call_time) AS 'Maximum (${unit})' WHERE ${condition}${facetByMetric(facet)}${timeseries(facet)}`,
  minimumValue: (condition, unit, facet = true) => `${from} SELECT min(min_call_time) AS 'Minimum (${unit})' WHERE ${condition}${facetByMetric(facet)}${timeseries(facet)}`,
  /** Every metric name Angler holds, in full, for the explorer's picker. */
  metricNames: () => `${from} SELECT uniques(name) WHERE name LIKE ${quote(PREFIX + '%')} SINCE 7 days ago LIMIT MAX`
}

module.exports = { EVENT, LABEL, quote, hasPlaceholder, namesOf, nameCondition, queries }
