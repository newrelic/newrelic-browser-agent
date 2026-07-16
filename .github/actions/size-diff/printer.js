import fs from 'fs'
import path from 'path'
import { Table } from 'console-table-printer'
import { filesize } from 'filesize'

const ASSET_KEYS = ['loader', 'async-chunk']

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
      ...labels.map(label => ({ name: `size_${label}`, title: displayLabel(label), alignment: 'center' })),
      ...diffLabels.map(label => ({ name: `diff_${label}`, title: `Δ ${displayLabel(baseLabel)} vs ${displayLabel(label)}`, alignment: 'center' }))
    ]
  })

  const sections = [
    ...Object.entries(comparisonStats.agents).map(([agent, byLabel]) => ({ agent, byLabel })),
    ...Object.entries(comparisonStats.interfaces || {}).map(([interfaceName, byLabel]) => ({ interfaceName, byLabel, interfaceSection: true })),
    { agent: 'npm', byLabel: comparisonStats.npm, npmSection: true }
  ]

  sections.forEach(({ agent, byLabel, npmSection, interfaceSection, interfaceName }, index) => {
    if (npmSection) {
      resultsTable.addRow(buildNpmRow(agent, byLabel, baseLabel, diffLabels, labels))
    } else if (interfaceSection) {
      resultsTable.addRow(buildInterfaceRow(interfaceName, byLabel, baseLabel, diffLabels, labels))
    } else {
      ASSET_KEYS.forEach(assetKey => {
        resultsTable.addRow(buildAssetRow(agent, assetKey, byLabel, baseLabel, diffLabels, labels))
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

  const headerCells = ['Agent', 'Asset', ...labels.map(displayLabel), ...diffLabels.map(label => `Δ ${displayLabel(baseLabel)} vs ${displayLabel(label)}`)]
  outputStream.write(`| ${headerCells.join(' | ')} |\n`)
  outputStream.write(`|${headerCells.map(() => '---').join('|')}|\n`)

  Object.entries(comparisonStats.agents)
    .forEach(([agent, byLabel]) => {
      ASSET_KEYS.forEach(assetKey => {
        const row = buildAssetRow(agent, assetKey, byLabel, baseLabel, diffLabels, labels, true)
        writeMarkdownRow(outputStream, row, labels, diffLabels)
      })
    })

  outputStream.write(`| ${headerCells.map(() => ' ').join(' | ')} |\n`)

  Object.entries(comparisonStats.interfaces || {})
    .forEach(([interfaceName, byLabel]) => {
      const row = buildInterfaceRow(interfaceName, byLabel, baseLabel, diffLabels, labels, true)
      writeMarkdownRow(outputStream, row, labels, diffLabels)
    })

  outputStream.write(`| ${headerCells.map(() => ' ').join(' | ')} |\n`)

  const npmRow = buildNpmRow('npm-distribution', comparisonStats.npm, baseLabel, diffLabels, labels, true)
  writeMarkdownRow(outputStream, npmRow, labels, diffLabels)

  await new Promise((resolve) => {
    outputStream.close(resolve)
  })
}

function writeMarkdownRow (outputStream, row, labels, diffLabels) {
  const cells = [
    row.agent,
    row.asset,
    ...labels.map(label => row[`size_${label}`]),
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

function buildAssetRow (agent, assetKey, byLabel, baseLabel, diffLabels, labels, colorize) {
  return buildFileSizeRow(agent, assetKey, label => byLabel[label] && byLabel[label][assetKey], baseLabel, diffLabels, labels, colorize)
}

function buildInterfaceRow (interfaceName, byLabel, baseLabel, diffLabels, labels, colorize) {
  return buildFileSizeRow('npm-interface', interfaceName, label => byLabel[label], baseLabel, diffLabels, labels, colorize)
}

function buildFileSizeRow (agent, assetKey, getEntry, baseLabel, diffLabels, labels, colorize) {
  const row = { agent, asset: assetKey }

  labels.forEach(label => {
    const entry = getEntry(label)
    const text = entry ? filesize(entry.gzipSize) : 'N/A'
    row[`size_${label}`] = (colorize && entry && label === baseLabel) ? highlightCurrentCell(text) : text
  })

  diffLabels.forEach(label => {
    const entry = getEntry(label)
    const baseEntry = getEntry(baseLabel)
    const diff = (entry && baseEntry) ? calcDiffStats(entry, baseEntry) : null
    row[`diff_${label}`] = diff ? formatPercent(diff.gzipSize, colorize) : 'N/A'
  })

  return row
}

function buildNpmRow (agent, byLabel, baseLabel, diffLabels, labels, colorize) {
  const row = { agent, asset: 'tarball' }

  labels.forEach(label => {
    const entry = byLabel[label]
    const text = filesize(entry.size)
    row[`size_${label}`] = (colorize && label === baseLabel) ? highlightCurrentCell(text) : text
  })

  diffLabels.forEach(label => {
    const diff = calcNpmDiffStats(byLabel[label], byLabel[baseLabel])
    row[`diff_${label}`] = formatPercent(diff.size, colorize)
  })

  return row
}

// A fixed hex color renders identically regardless of the viewer's light or
// dark GitHub theme (unlike CSS variables), and this royal purple stays
// visually distinct from the green/orange/red used for diff cells below.
// `\colorbox` (background fill) is not in GitHub's allowed macro set, so
// this uses bold `\textcolor` text instead.
const CURRENT_COLUMN_COLOR = '#8e5fd1'

function highlightCurrentCell (text) {
  // \textbf already switches into text mode for its argument, so nesting
  // \text inside it (rather than inside \textcolor directly) trips
  // "\text is only supported in math mode".
  return `$\\textcolor{${CURRENT_COLUMN_COLOR}}{\\textbf{${text}}}$`
}

// GitHub's PR comment renderer supports KaTeX math, including KaTeX's
// `\textcolor{name}{...}` macro, so this is the only way to get colored text
// into a markdown table cell without raw HTML (which GitHub strips `style`
// attributes from in comments). Note: `\color{name}` only takes one argument
// and colors the rest of the group — `\textcolor` is the two-argument form.
function formatPercent (value, colorize) {
  if (!colorize) return `${value}%`
  // Wrapped in \text{} so KaTeX renders this as literal text rather than
  // math notation — without it, `\%` can render without the percent glyph.
  return `$\\textcolor{${percentColor(value)}}{\\text{${value}\\%}}$`
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
