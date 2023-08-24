import fs from 'fs'
import path from 'path'
import { Table } from 'console-table-printer'
import { filesize } from 'filesize'

export function consolePrinter (comparisonStats) {
  const resultsTable = new Table({
    title: `Build Size Stats: dev...local`,
    columns: [
      { name: 'agent', title: 'Agent', alignment: 'left' },
      { name: 'asset', title: 'Asset', alignment: 'left' },
      { name: 'fromSize', title: 'Previous Size', alignment: 'center' },
      { name: 'toSize', title: 'New Size', alignment: 'center' },
      { name: 'diff', title: 'Diff', alignment: 'center' },
    ]
  })

  Object.entries(comparisonStats)
    .forEach(([agent, statsData], index, entries) => {
      const diffStats = calcDiffStats(statsData)

      resultsTable.addRows([
        {
          agent,
          asset: 'loader',
          fromSize: `${filesize(statsData.from.loader.fileSize)} / ${filesize(statsData.from.loader.gzipSize)} (gzip)`,
          toSize: `${filesize(statsData.to.loader.fileSize)} / ${filesize(statsData.to.loader.gzipSize)} (gzip)`,
          diff: `${diffStats.loader.fileSize}% / ${diffStats.loader.gzipSize}% (gzip)`
        },
        {
          agent,
          asset: 'async-chunk',
          fromSize: `${filesize(statsData.from['async-chunk'].fileSize)} / ${filesize(statsData.from['async-chunk'].gzipSize)} (gzip)`,
          toSize: `${filesize(statsData.to['async-chunk'].fileSize)} / ${filesize(statsData.to['async-chunk'].gzipSize)} (gzip)`,
          diff: `${diffStats['async-chunk'].fileSize}% / ${diffStats['async-chunk'].gzipSize}% (gzip)`
        }
      ])

      if (index < entries.length - 1) {
        resultsTable.addRow({})
      }
    })

  resultsTable.printTable()
}

export async function markdownPrinter (comparisonStats, outputLocation, outputFileName) {
  await fs.promises.mkdir(outputLocation, { recursive: true })

  const outputStream = fs.createWriteStream(path.join(outputLocation, outputFileName), {
    autoClose: true,
    encoding: 'utf-8',
    flags: 'w'
  })
  outputStream.write('| Agent | Asset | Previous Size | New Size | Diff |\n')
  outputStream.write('|-------|-------|:-------------:|:--------:|:----:|\n')

  Object.entries(comparisonStats)
    .forEach(([agent, statsData], index, entries) => {
      const diffStats = calcDiffStats(statsData)

      outputStream.write(`|${agent}`)
      outputStream.write(`|loader`)
      outputStream.write(`|${filesize(statsData.from.loader.fileSize)} / ${filesize(statsData.from.loader.gzipSize)} (gzip)`)
      outputStream.write(`|${filesize(statsData.to.loader.fileSize)} / ${filesize(statsData.to.loader.gzipSize)} (gzip)`)
      outputStream.write(`|${diffStats.loader.fileSize}% / ${diffStats.loader.gzipSize}% (gzip)|\n`)

      outputStream.write(`|${agent}`)
      outputStream.write(`|async-chunk`)
      outputStream.write(`|${filesize(statsData.from['async-chunk'].fileSize)} / ${filesize(statsData.from['async-chunk'].gzipSize)} (gzip)`)
      outputStream.write(`|${filesize(statsData.to['async-chunk'].fileSize)} / ${filesize(statsData.to['async-chunk'].gzipSize)} (gzip)`)
      outputStream.write(`|${diffStats['async-chunk'].fileSize}% / ${diffStats['async-chunk'].gzipSize}% (gzip)|\n`)

      if (index < entries.length - 1) {
        outputStream.write('| | | | | |\n')
      }
    })

  await new Promise((resolve) => {
    outputStream.close(resolve)
  })
}

export async function jsonPrinter (comparisonStats, outputLocation, outputFileName) {
  await fs.promises.mkdir(outputLocation, { recursive: true })

  const reportData = Object.entries(comparisonStats)
    .reduce((aggregator, [agent, statsData]) => {
      aggregator[agent] = {
        ...statsData,
        diff: calcDiffStats(statsData)
      }
      return aggregator
    }, {})

  await fs.promises.writeFile(path.join(outputLocation, outputFileName), JSON.stringify(reportData, null, 2), {
    encoding: 'utf-8'
  })
}

function calcDiffStats (statsData) {
  return {
    loader: {
      fileSize: Math.round((((statsData.to.loader.fileSize - statsData.from.loader.fileSize) / statsData.from.loader.fileSize) + Number.EPSILON) * 10000) / 100,
      gzipSize: Math.round((((statsData.to.loader.gzipSize - statsData.from.loader.gzipSize) / statsData.from.loader.gzipSize) + Number.EPSILON) * 10000) / 100,
    },
    ['async-chunk']: {
      fileSize: Math.round((((statsData.to['async-chunk'].fileSize - statsData.from['async-chunk'].fileSize) / statsData.from['async-chunk'].fileSize) + Number.EPSILON) * 10000) / 100,
      gzipSize: Math.round((((statsData.to['async-chunk'].gzipSize - statsData.from['async-chunk'].gzipSize) / statsData.from['async-chunk'].gzipSize) + Number.EPSILON) * 10000) / 100,
    }
  }
}
