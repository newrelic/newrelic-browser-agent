/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates the supportability dashboard from the registry, in the shape NerdGraph's `DashboardInput` takes (the same shape as a
 * dashboard exported from the New Relic UI).
 *
 * Instead of a set of charts per metric, which would be hundreds of widgets, it has:
 * - a Metric Explorer page, which comes first (the dashboard opens on it). It is the only page that uses the dashboard's one variable, `metric`,
 *   a picker filled from the data itself, so a metric Angler starts to track appears in it without the dashboard being regenerated. With no
 *   metric picked the picker is null and every chart on the page is empty; with one picked, every chart shows just that metric, and
 * - one page per registry section, in alphabetical order, with the rate by metric, the accounts and apps reporting, the top accounts and
 *   apps, and the average, minimum and maximum of the metrics in that section that report a value. Their queries are fixed: they always
 *   show the whole section, whatever the picker is set to.
 */

const { queries, nameCondition, hasPlaceholder } = require('./nrql')

const METRIC_VARIABLE = 'metric'
/** Narrows a chart to the one metric picked in the variable. With nothing picked no metric matches, so the chart is empty. */
const METRIC_FILTER = `name = {{${METRIC_VARIABLE}}}`
const GRID_COLUMNS = 12

/** Lays widgets out left to right on a 12 column grid, starting a new row when one does not fit. */
class Grid {
  constructor () {
    this.row = 1
    this.column = 1
    this.rowHeight = 0
  }

  /** Starts a new row even if the current one has room. */
  nextRow () {
    this.row += this.rowHeight
    this.column = 1
    this.rowHeight = 0
  }

  /**
   * @param {number} width
   * @param {number} height
   * @returns {{column: number, row: number, width: number, height: number}}
   */
  place (width, height) {
    if (this.column + width - 1 > GRID_COLUMNS) this.nextRow()
    const layout = { column: this.column, row: this.row, width, height }
    this.column += width
    this.rowHeight = Math.max(this.rowHeight, height)
    return layout
  }
}

/**
 * @param {string} visualization `viz.line`, `viz.area`, `viz.bar`, `viz.pie`, `viz.table` or `viz.billboard`.
 * @returns {Object} The chart options New Relic expects for that visualization.
 */
function chartOptions (visualization) {
  const facet = { showOtherSeries: visualization === 'viz.line' || visualization === 'viz.pie' }
  if (visualization === 'viz.line' || visualization === 'viz.area') return { facet, legend: { enabled: true }, yAxisLeft: { zero: true } }
  if (visualization === 'viz.pie') return { facet, legend: { enabled: true } }
  return { facet }
}

/**
 * @param {Object} context `{ dataAccountId }`
 * @param {Grid} grid
 * @param {string} visualization
 * @param {string} title
 * @param {string} query
 * @param {[number, number]} size Width and height.
 * @returns {Object} A widget.
 */
function chart (context, grid, visualization, title, query, [width, height]) {
  return {
    title,
    layout: grid.place(width, height),
    visualization: { id: visualization },
    rawConfiguration: {
      ...chartOptions(visualization),
      nrqlQueries: [{ accountIds: [context.dataAccountId], query }],
      platformOptions: { ignoreTimeRange: false }
    }
  }
}

/** @returns {Object} A markdown widget. */
const markdown = (grid, text, [width, height]) => ({ title: '', layout: grid.place(width, height), visualization: { id: 'viz.markdown' }, rawConfiguration: { text } })

const BILLBOARD = [4, 3]
const WIDE = [8, 4]
const HALF = [6, 4]
const THIRD = [4, 4]

/**
 * @param {Object} context
 * @param {Grid} grid
 * @param {string} condition
 * @param {string} scope What the charts are about, used in titles, e.g. `this section`.
 * @returns {Object[]} The billboards that open a page: calls, metrics, accounts and apps.
 */
function summaryBillboards (context, grid, condition, scope) {
  return [
    chart(context, grid, 'viz.billboard', `Calls (${scope})`, queries.totalCalls(condition), BILLBOARD),
    chart(context, grid, 'viz.billboard', 'Accounts reporting', queries.accountsReporting(condition), BILLBOARD),
    chart(context, grid, 'viz.billboard', 'Apps reporting', queries.appsReporting(condition), BILLBOARD)
  ]
}

/**
 * The average, maximum and minimum of a value, one row of three charts.
 * @param {Object} context
 * @param {Grid} grid
 * @param {string} condition
 * @param {string} unit
 * @param {string} subject What the value is about, used in titles.
 * @param {boolean} facet Whether to draw one line per metric.
 * @returns {Object[]}
 */
function valueCharts (context, grid, condition, unit, subject, facet) {
  grid.nextRow()
  return [
    chart(context, grid, 'viz.line', `${subject}: average value (${unit})`, queries.averageValue(condition, unit, facet), THIRD),
    chart(context, grid, 'viz.line', `${subject}: maximum value (${unit})`, queries.maximumValue(condition, unit, facet), THIRD),
    chart(context, grid, 'viz.line', `${subject}: minimum value (${unit})`, queries.minimumValue(condition, unit, facet), THIRD)
  ]
}

/**
 * @param {import('../registry-types').RegistrySection} section
 * @param {import('../registry-types').RegistryEntry[]} entries The section's entries.
 * @param {Object} context
 * @returns {Object} The page for one registry section.
 */
function sectionPage (section, entries, context) {
  const grid = new Grid()
  const condition = nameCondition(entries)
  const widgets = []
  if (section.intro) {
    widgets.push(markdown(grid, section.intro, [12, 2]))
    grid.nextRow()
  }
  widgets.push(...summaryBillboards(context, grid, condition, 'this section'))
  grid.nextRow()
  // A section with a single metric has nothing to compare, so it does not need a per-metric bar next to the rate
  const singleMetric = entries.length === 1 && !entries[0].values && !hasPlaceholder(entries[0])
  widgets.push(chart(context, grid, 'viz.line', 'Rate by metric', queries.rateByMetric(condition), singleMetric ? [12, 4] : WIDE))
  if (!singleMetric) widgets.push(chart(context, grid, 'viz.bar', 'Total by metric', queries.totalByMetric(condition), [4, 4]))
  grid.nextRow()
  widgets.push(chart(context, grid, 'viz.line', 'Rate by account (top 10)', queries.rateByAccount(condition), HALF))
  widgets.push(chart(context, grid, 'viz.line', 'Rate by app (top 10)', queries.rateByApp(condition), HALF))

  // One row of average, maximum and minimum per unit, for the metrics in this section that report a value
  const byUnit = {}
  entries.filter(entry => entry.value).forEach(entry => { (byUnit[entry.value.unit] = byUnit[entry.value.unit] || []).push(entry) })
  Object.entries(byUnit).forEach(([unit, valueEntries]) => {
    const only = Object.fromEntries(valueEntries.filter(entry => entry.value.for).map(entry => [entry.tag, entry.value.for]))
    widgets.push(...valueCharts(context, grid, nameCondition(valueEntries, { only }), unit, 'Metrics that report a value', true))
  })
  return { name: section.title, description: `Generated from the "${section.title}" section of the registry.`, widgets }
}

/**
 * The explorer page: the charts for the one metric picked in the variable. Nothing is shown until one is picked.
 * @param {Object} context
 * @returns {Object}
 */
function explorerPage (context) {
  const grid = new Grid()
  const condition = METRIC_FILTER
  const widgets = [
    chart(context, grid, 'viz.billboard', 'Calls', queries.totalCalls(condition), BILLBOARD),
    chart(context, grid, 'viz.billboard', 'Accounts reporting', queries.accountsReporting(condition), BILLBOARD),
    chart(context, grid, 'viz.billboard', 'Apps reporting', queries.appsReporting(condition), BILLBOARD)
  ]
  grid.nextRow()
  widgets.push(chart(context, grid, 'viz.line', 'Rate', queries.rate(condition), [12, 4]))
  grid.nextRow()
  widgets.push(chart(context, grid, 'viz.line', 'Rate by account (top 10)', queries.rateByAccount(condition), HALF))
  widgets.push(chart(context, grid, 'viz.line', 'Rate by app (top 10)', queries.rateByApp(condition), HALF))
  widgets.push(...valueCharts(context, grid, condition, 'value', 'Selected metric', false))
  return { name: 'Metric Explorer', description: 'Generated. Pick one metric to see it.', widgets }
}

/**
 * @param {Object} context
 * @returns {Object[]} The dashboard variables.
 */
function variables (context) {
  return [{
    name: METRIC_VARIABLE,
    title: 'Supportability Metric',
    type: 'NRQL',
    items: null,
    isMultiSelection: false,
    replacementStrategy: 'STRING',
    defaultValues: null,
    nrqlQuery: { accountIds: [context.dataAccountId], query: queries.metricNames() },
    options: { ignoreTimeRange: true }
  }]
}

/**
 * @param {import('../registry-types').Registry} registry
 * @param {{dataAccountId: number, name: string, description?: string}} options The account the `Supportability` events are in (every query reads it,
 *   wherever the dashboard itself is created), and the dashboard's name.
 * @returns {Object} The dashboard, as NerdGraph's `DashboardInput`.
 */
function buildDashboard (registry, { dataAccountId, name, description }) {
  const context = { dataAccountId }
  const sectionPages = registry.sections
    .map(section => ({ section, entries: registry.entries.filter(entry => entry.section === section.id) }))
    .filter(({ entries }) => entries.length)
    .map(({ section, entries }) => sectionPage(section, entries, context))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
  // The explorer is always first, because a link to the dashboard opens its first page. Every section page follows in alphabetical order.
  const pages = [explorerPage(context), ...sectionPages]
  return {
    name,
    description: description || 'Generated from tools/supportability-metrics/registry.js in newrelic/newrelic-browser-agent. Do not edit: changes are overwritten.',
    permissions: 'PUBLIC_READ_WRITE',
    pages,
    variables: variables(context)
  }
}

module.exports = { buildDashboard, Grid, METRIC_VARIABLE }
