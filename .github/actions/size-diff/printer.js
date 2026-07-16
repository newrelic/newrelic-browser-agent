import fs from 'fs'
import path from 'path'
import { Table } from 'console-table-printer'

const ASSET_KEYS = ['loader', 'async-chunk']

// A non-breaking space survives whitespace-collapsing wherever a plain ' '
// might not (e.g. inside a rendered SVG badge), so fixed-width padding below
// uses it instead of a regular space.
const NBSP = ' '

export function consolePrinter (comparisonStats) {
  const { baseLabel, displayLabels = {} } = comparisonStats
  const labels = [...comparisonStats.labels].reverse()
  const diffLabels = labels.filter(label => label !== baseLabel)
  const displayLabel = label => displayLabels[label] || label

  const resultsTable = new Table({
    title: `Build Size Stats: ${labels.map(displayLabel).join(' / ')}`,
    columns: [
      { name: 'agent', title: 'Agent', alignment: 'left' },
      { name: 'asset', title: 'Asset', alignment: 'left' },
      { name: `size_${baseLabel}`, title: displayLabel(baseLabel), alignment: 'center' },
      ...diffLabels.map(label => ({ name: `diff_${label}`, title: `Δ ${displayLabel(label)}`, alignment: 'center' }))
    ]
  })

  const sections = [
    ...Object.entries(comparisonStats.agents).map(([agent, byLabel]) => ({ agent, byLabel })),
    ...Object.entries(comparisonStats.interfaces || {}).map(([interfaceName, byLabel]) => ({ interfaceName, byLabel, interfaceSection: true })),
    { byLabel: comparisonStats.npm, npmSection: true }
  ]

  sections.forEach(({ agent, byLabel, npmSection, interfaceSection, interfaceName }, index) => {
    if (npmSection) {
      resultsTable.addRow(buildNpmRow(byLabel, baseLabel, diffLabels))
    } else if (interfaceSection) {
      resultsTable.addRow(buildInterfaceRow(interfaceName, byLabel, baseLabel, diffLabels))
    } else {
      ASSET_KEYS.forEach(assetKey => {
        resultsTable.addRow(buildAssetRow(agent, assetKey, byLabel, baseLabel, diffLabels))
      })
    }

    if (index < sections.length - 1) {
      resultsTable.addRow({})
    }
  })

  resultsTable.printTable()
}

export async function markdownPrinter (comparisonStats, outputLocation, outputFileName) {
  const { baseLabel, displayLabels = {} } = comparisonStats
  const labels = [...comparisonStats.labels].reverse()
  const diffLabels = labels.filter(label => label !== baseLabel)
  const displayLabel = label => displayLabels[label] || label

  await fs.promises.mkdir(outputLocation, { recursive: true })

  const outputStream = fs.createWriteStream(path.join(outputLocation, outputFileName), {
    autoClose: true,
    encoding: 'utf-8',
    flags: 'w'
  })

  const headerCells = [
    'Agent',
    'Asset',
    displayLabel(baseLabel),
    ...diffLabels.map(label => `Δ ${displayLabel(label)}`)
  ]
  outputStream.write(`| ${headerCells.join(' | ')} |\n`)
  outputStream.write(`|${headerCells.map(() => '---').join('|')}|\n`)

  Object.entries(comparisonStats.agents)
    .forEach(([agent, byLabel]) => {
      ASSET_KEYS.forEach(assetKey => {
        const row = buildAssetRow(agent, assetKey, byLabel, baseLabel, diffLabels, true)
        writeMarkdownRow(outputStream, row, baseLabel, diffLabels)
      })
    })

  outputStream.write(`| ${headerCells.map(() => ' ').join(' | ')} |\n`)

  Object.entries(comparisonStats.interfaces || {})
    .forEach(([interfaceName, byLabel]) => {
      const row = buildInterfaceRow(interfaceName, byLabel, baseLabel, diffLabels, true)
      writeMarkdownRow(outputStream, row, baseLabel, diffLabels)
    })

  outputStream.write(`| ${headerCells.map(() => ' ').join(' | ')} |\n`)

  const npmRow = buildNpmRow(comparisonStats.npm, baseLabel, diffLabels, true)
  writeMarkdownRow(outputStream, npmRow, baseLabel, diffLabels)

  await new Promise((resolve) => {
    outputStream.close(resolve)
  })
}

function writeMarkdownRow (outputStream, row, baseLabel, diffLabels) {
  const cells = [
    row.agent,
    row.asset,
    row[`size_${baseLabel}`],
    ...diffLabels.map(label => row[`diff_${label}`])
  ]
  outputStream.write(`| ${cells.join(' | ')} |\n`)
}

export async function jsonPrinter (comparisonStats, outputLocation, outputFileName) {
  const { labels, baseLabel, displayLabels = {} } = comparisonStats
  const diffLabels = labels.filter(label => label !== baseLabel)

  await fs.promises.mkdir(outputLocation, { recursive: true })

  const reportData = {
    labels,
    baseLabel,
    displayLabels,
    agents: Object.entries(comparisonStats.agents).reduce((aggregator, [agent, byLabel]) => {
      aggregator[agent] = ASSET_KEYS.reduce((assets, assetKey) => {
        assets[assetKey] = {
          sizes: labels.reduce((byLabelSizes, label) => {
            byLabelSizes[label] = byLabel[label][assetKey]
            return byLabelSizes
          }, {}),
          diff: diffLabels.reduce((diffs, label) => {
            diffs[label] = calcDiffStats(byLabel[label][assetKey], byLabel[baseLabel][assetKey])
            return diffs
          }, {})
        }
        return assets
      }, {})
      return aggregator
    }, {}),
    interfaces: Object.entries(comparisonStats.interfaces || {}).reduce((aggregator, [interfaceName, byLabel]) => {
      aggregator[interfaceName] = {
        sizes: labels.reduce((byLabelSizes, label) => {
          byLabelSizes[label] = byLabel[label] || null
          return byLabelSizes
        }, {}),
        diff: diffLabels.reduce((diffs, label) => {
          diffs[label] = (byLabel[label] && byLabel[baseLabel]) ? calcDiffStats(byLabel[label], byLabel[baseLabel]) : null
          return diffs
        }, {})
      }
      return aggregator
    }, {}),
    npm: {
      sizes: comparisonStats.npm,
      diff: diffLabels.reduce((diffs, label) => {
        diffs[label] = calcNpmDiffStats(comparisonStats.npm[label], comparisonStats.npm[baseLabel])
        return diffs
      }, {})
    }
  }

  await fs.promises.writeFile(path.join(outputLocation, outputFileName), JSON.stringify(reportData, null, 2), {
    encoding: 'utf-8'
  })
}

function buildAssetRow (agent, assetKey, byLabel, baseLabel, diffLabels, colorize) {
  return buildRow({
    agent,
    asset: assetKey,
    getEntry: label => byLabel[label] && byLabel[label][assetKey],
    metrics: [entry => entry.gzipSize],
    baseLabel,
    diffLabels,
    colorize
  })
}

function buildInterfaceRow (interfaceName, byLabel, baseLabel, diffLabels, colorize) {
  return buildRow({
    agent: 'npm-interface',
    asset: interfaceName,
    getEntry: label => byLabel[label],
    metrics: [entry => entry.gzipSize],
    baseLabel,
    diffLabels,
    colorize
  })
}

function buildNpmRow (byLabel, baseLabel, diffLabels, colorize) {
  return buildRow({
    agent: 'npm-distribution',
    asset: 'tarball',
    getEntry: label => byLabel[label],
    metrics: [entry => entry.size],
    baseLabel,
    diffLabels,
    colorize
  })
}

// Shared row builder for the asset/interface/npm rows. `metrics` is a list
// of accessors run against a label's entry -- always a single accessor here
// since loader/async-chunk stay on separate rows, but kept as a list so npm
// (`size`) and interface (`gzipSize`) rows share the same formatting/diff
// logic without a second code path.
function buildRow ({ agent, asset, getEntry, metrics, baseLabel, diffLabels, colorize }) {
  const row = { agent, asset }

  const baseEntry = getEntry(baseLabel)
  const baseText = baseEntry ? metrics.map(metric => formatFixedSize(metric(baseEntry))).join(' + ') : 'N/A'

  if (!colorize || !baseEntry) {
    row[`size_${baseLabel}`] = baseText
  } else {
    const severity = worstDiff(getEntry, metrics, baseLabel, diffLabels)
    row[`size_${baseLabel}`] = sizeBadge(baseText, percentColor(severity))
  }

  diffLabels.forEach(label => {
    const value = worstDiffForLabel(getEntry, metrics, baseLabel, label)
    row[`diff_${label}`] = value === null ? 'N/A' : formatPercent(value, colorize)
  })

  return row
}

function worstDiffForLabel (getEntry, metrics, baseLabel, label) {
  const entry = getEntry(label)
  const baseEntry = getEntry(baseLabel)
  if (!entry || !baseEntry) return null

  return Math.max(...metrics.map(metric => calcPercentDiff(metric(entry), metric(baseEntry))))
}

function worstDiff (getEntry, metrics, baseLabel, diffLabels) {
  const diffs = diffLabels
    .map(label => worstDiffForLabel(getEntry, metrics, baseLabel, label))
    .filter(value => value !== null)

  return diffs.length ? Math.max(...diffs) : 0
}

// Fixed-width size text: 3 integer digits, a period, 3 decimal digits, a
// space, and the unit (B/KB/MB) -- 10 characters total, so every value in a
// column lines up regardless of magnitude.
function formatFixedSize (bytes) {
  let value, unit
  if (bytes < 1000) {
    value = bytes
    unit = 'B'
  } else if (bytes < 1000000) {
    value = bytes / 1000
    unit = 'KB'
  } else {
    value = bytes / 1000000
    unit = 'MB'
  }

  const [intPart, decPart] = value.toFixed(3).split('.')
  const numeric = `${intPart.padStart(3, NBSP)}.${decPart}`
  const text = `${numeric} ${unit}`
  return text.length < 10 ? text.padEnd(10, NBSP) : text
}

// Fixed-width percent text: a sign, 3 integer digits, a period, 2 decimal
// digits, and a percent sign -- so every delta cell in a column lines up
// regardless of magnitude or sign.
function formatFixedPercent (value) {
  const sign = value < 0 ? '-' : '+'
  const [intPart, decPart] = Math.abs(value).toFixed(2).split('.')
  return `${sign}${intPart.padStart(3, NBSP)}.${decPart}%`
}

// GitHub strips `style` attributes from raw HTML in comments, and its math
// (KaTeX) renderer only supports a restricted macro subset that turned out
// too unreliable here (disallowed `\colorbox`, dropped unit suffixes even
// inside `\text{}`). A shields.io badge image is a well-established, robust
// way to get colored content into a markdown table cell instead.
function sizeBadge (text, color) {
  return `![${text}](https://img.shields.io/static/v1?label=&message=${encodeURIComponent(text)}&color=${color})`
}

function formatPercent (value, colorize) {
  const text = formatFixedPercent(value)
  if (!colorize) return text
  return sizeBadge(text, percentColor(value))
}

function percentColor (value) {
  if (value < 2) return 'green'
  if (value <= 5) return 'orange'
  return 'red'
}

function calcDiffStats (fromEntry, toEntry) {
  return {
    fileSize: calcPercentDiff(fromEntry.fileSize, toEntry.fileSize),
    gzipSize: calcPercentDiff(fromEntry.gzipSize, toEntry.gzipSize)
  }
}

function calcNpmDiffStats (fromEntry, toEntry) {
  return {
    size: calcPercentDiff(fromEntry.size, toEntry.size),
    unpackedSize: calcPercentDiff(fromEntry.unpackedSize, toEntry.unpackedSize)
  }
}

function calcPercentDiff (fromValue, toValue) {
  return Math.round((((toValue - fromValue) / fromValue) + Number.EPSILON) * 10000) / 100
}
