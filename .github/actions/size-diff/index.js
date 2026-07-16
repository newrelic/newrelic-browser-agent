import fs from 'fs'
import path from 'path'
import { reportSettings } from './report-settings.js'
import { getAllLocalStats, getNpmPackStats } from './get-stats.js'
import { consolePrinter, markdownPrinter, jsonPrinter } from './printer.js'
import { args, parseStatsFileArgs } from './args.js'

if (args.mode === 'capture') {
  await runCapture()
} else {
  await runCompare()
}

async function runCapture () {
  const agents = await getAllLocalStats(args.buildDir)
  const npm = await getNpmPackStats(args.npmPackFile)

  const capture = {
    label: args.label,
    agents,
    npm
  }

  await fs.promises.mkdir(path.dirname(args.outputFile), { recursive: true })
  await fs.promises.writeFile(args.outputFile, JSON.stringify(capture, null, 2), { encoding: 'utf-8' })
}

async function runCompare () {
  const statsFiles = parseStatsFileArgs(args.statsFile)

  const captures = await Promise.all(
    statsFiles.map(async ({ label, path: statsFilePath }) => {
      const capture = JSON.parse(await fs.promises.readFile(statsFilePath, { encoding: 'utf-8' }))
      return { label, capture }
    })
  )

  const labels = captures.map(({ label }) => label)
  const baseLabel = labels[0]

  const agents = Object.keys(reportSettings).reduce((aggregator, agentName) => {
    aggregator[agentName] = captures.reduce((byLabel, { label, capture }) => {
      byLabel[label] = capture.agents[agentName]
      return byLabel
    }, {})
    return aggregator
  }, {})

  const npm = captures.reduce((byLabel, { label, capture }) => {
    byLabel[label] = capture.npm
    return byLabel
  }, {})

  const comparisonStats = { labels, baseLabel, agents, npm }

  if (args.format.includes('terminal')) {
    consolePrinter(comparisonStats)
  }

  if (args.format.includes('markdown')) {
    await markdownPrinter(comparisonStats, args.outputDir, args.outputMarkdownFileName)
  }

  if (args.format.includes('json')) {
    await jsonPrinter(comparisonStats, args.outputDir, args.outputJsonFileName)
  }
}
