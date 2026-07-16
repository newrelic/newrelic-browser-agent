import fs from 'fs'
import path from 'path'
import { Table } from 'console-table-printer'
import { filesize } from 'filesize'

const ASSET_KEYS = ['loader', 'async-chunk']

export function consolePrinter (comparisonStats) {
  const { labels, baseLabel } = comparisonStats
  const diffLabels = labels.filter(label => label !== baseLabel)

  const resultsTable = new Table({
    title: `Build Size Stats: ${labels.join(' / ')}`,
    columns: [
      { name: 'agent', title: 'Agent', alignment: 'left' },
      { name: 'asset', title: 'Asset', alignment: 'left' },
      ...labels.map(label => ({ name: `size_${label}`, title: label, alignment: 'center' })),
      ...diffLabels.map(label => ({ name: `diff_${label}`, title: `Δ ${baseLabel} vs ${label}`, alignment: 'center' }))
    ]
  })

  const sections = [
    ...Object.entries(comparisonStats.agents).map(([agent, byLabel]) => ({ agent, byLabel })),
    { agent: 'npm', byLabel: comparisonStats.npm, npmSection: true }
  ]

  sections.forEach(({ agent, byLabel, npmSection }, index) => {
    if (npmSection) {
      resultsTable.addRow(buildNpmRow(agent, byLabel, baseLabel, diffLabels, labels))
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
  const { labels, baseLabel } = comparisonStats
  const diffLabels = labels.filter(label => label !== baseLabel)

  await fs.promises.mkdir(outputLocation, { recursive: true })

  const outputStream = fs.createWriteStream(path.join(outputLocation, outputFileName), {
    autoClose: true,
    encoding: 'utf-8',
    flags: 'w'
  })

  const headerCells = ['Agent', 'Asset', ...labels, ...diffLabels.map(label => `Δ ${baseLabel} vs ${label}`)]
  outputStream.write(`| ${headerCells.join(' | ')} |\n`)
  outputStream.write(`|${headerCells.map(() => '---').join('|')}|\n`)

  Object.entries(comparisonStats.agents)
    .forEach(([agent, byLabel]) => {
      ASSET_KEYS.forEach(assetKey => {
        const row = buildAssetRow(agent, assetKey, byLabel, baseLabel, diffLabels, labels)
        writeMarkdownRow(outputStream, row, labels, diffLabels)
      })
    })

  outputStream.write(`| ${headerCells.map(() => ' ').join(' | ')} |\n`)

  const npmRow = buildNpmRow('npm-distribution', comparisonStats.npm, baseLabel, diffLabels, labels)
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
  const { labels, baseLabel } = comparisonStats
  const diffLabels = labels.filter(label => label !== baseLabel)

  await fs.promises.mkdir(outputLocation, { recursive: true })

  const reportData = {
    labels,
    baseLabel,
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

function buildAssetRow (agent, assetKey, byLabel, baseLabel, diffLabels, labels) {
  const row = { agent, asset: assetKey }

  labels.forEach(label => {
    const entry = byLabel[label][assetKey]
    row[`size_${label}`] = `${filesize(entry.fileSize)} / ${filesize(entry.gzipSize)} (gzip)`
  })

  diffLabels.forEach(label => {
    const diff = calcDiffStats(byLabel[label][assetKey], byLabel[baseLabel][assetKey])
    row[`diff_${label}`] = `${diff.fileSize}% / ${diff.gzipSize}% (gzip)`
  })

  return row
}

function buildNpmRow (agent, byLabel, baseLabel, diffLabels, labels) {
  const row = { agent, asset: 'tarball' }

  labels.forEach(label => {
    const entry = byLabel[label]
    row[`size_${label}`] = `${filesize(entry.size)} / ${filesize(entry.unpackedSize)} (unpacked)`
  })

  diffLabels.forEach(label => {
    const diff = calcNpmDiffStats(byLabel[label], byLabel[baseLabel])
    row[`diff_${label}`] = `${diff.size}% / ${diff.unpackedSize}% (unpacked)`
  })

  return row
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
