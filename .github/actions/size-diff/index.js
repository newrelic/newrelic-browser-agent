import { reportSettings } from './report-settings.js'
import { getAllVersionStats } from './get-stats.js'
import { consolePrinter, markdownPrinter, jsonPrinter } from './printer.js'
import { args } from './args.js'

const compareFromStats = await getAllVersionStats(args.compareFrom)
const compareToStats = await getAllVersionStats(args.compareTo)

const comparisonStats = Object.keys(reportSettings)
  .reduce((aggregator, reportKey) => {
    aggregator[reportKey] = {
      from: compareFromStats[reportKey],
      to: compareToStats[reportKey]
    }
    return aggregator
  }, {})

if (args.format.includes('terminal')) {
  consolePrinter(comparisonStats)
}

if (args.format.includes('markdown')) {
  await markdownPrinter(comparisonStats, args.outputDir, args.outputMarkdownFileName)
}

if (args.format.includes('json')) {
  await jsonPrinter(comparisonStats, args.outputDir, args.outputJsonFileName)
}
