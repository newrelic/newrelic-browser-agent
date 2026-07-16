import fs from 'fs'
import path from 'path'
import url from 'url'
import { reportSettings } from './report-settings.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export async function getAllLocalStats () {
  return (await Promise.all(
    Object.entries(reportSettings)
      .map(([name, reportSetting]) =>
        getLocalStats(reportSetting)
          .then(stats => ([name, stats]))
      )
  )).reduce((aggregator, [name, stats]) => {
    aggregator[name] = stats
    return aggregator
  }, {})
}

async function getLocalStats (reportSetting) {
  const statsFileName = await findLocalStatsFile(reportSetting.statsFileNameTemplate)
  const statsFileContent = JSON.parse(await fs.promises.readFile(statsFileName))

  return parseStatsFile(reportSetting, statsFileContent)
}

function parseStatsFile (reportSetting, statsFileContent) {
  let results = {}
  for (const assetSetting of reportSetting.assetFileNameTemplates) {
    const assetFileNameRegex = assetSetting.fileNameRegex()

    const assetFileStats = statsFileContent.find(stats =>
      assetFileNameRegex.test(stats.label)
    )

    if (!assetFileStats) {
      throw new Error(`No stats exist matching pattern ${assetFileNameRegex.toString()}.`)
    }

    results[assetSetting.name] = {
      fileSize: assetFileStats.parsedSize,
      gzipSize: assetFileStats.gzipSize
    }
  }

  return results
}

async function findLocalStatsFile (statsFileNameTemplate) {
  const buildDir = path.resolve(
    path.join(__dirname, '../../../build')
  )
  const buildFiles = await fs.promises.readdir(buildDir, { withFileTypes: true })

  const foundFiles = buildFiles.filter(file =>
    file.isFile && file.name.endsWith('.json') && file.name.startsWith(statsFileNameTemplate.split('{{version}}')[0])
  )

  if (!Array.isArray(foundFiles) || foundFiles.length === 0) {
    throw new Error(`No local stats files exist matching pattern ${statsFileNameTemplate}.`)
  } else if (foundFiles.length > 1) {
    throw new Error(`Multiple local stats files exist matching pattern ${statsFileNameTemplate}.`)
  }

  return path.join(buildDir, foundFiles[0].name)
}

export async function getNpmPackStats (npmPackJsonPath) {
  const npmPackContent = JSON.parse(await fs.promises.readFile(npmPackJsonPath))
  const [packageEntry] = npmPackContent

  if (!packageEntry) {
    throw new Error(`No package entry found in npm pack output ${npmPackJsonPath}.`)
  }

  return {
    size: packageEntry.size,
    unpackedSize: packageEntry.unpackedSize
  }
}
