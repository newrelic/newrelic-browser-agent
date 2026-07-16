import fs from 'fs'
import path from 'path'
import { reportSettings } from './report-settings.js'

export async function getAllLocalStats (buildDir) {
  return (await Promise.all(
    Object.entries(reportSettings)
      .map(([name, reportSetting]) =>
        getLocalStats(buildDir, reportSetting)
          .then(stats => ([name, stats]))
      )
  )).reduce((aggregator, [name, stats]) => {
    aggregator[name] = stats
    return aggregator
  }, {})
}

async function getLocalStats (buildDir, reportSetting) {
  const statsFileName = await findLocalStatsFile(buildDir, reportSetting.statsFileNameTemplate)
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

async function findLocalStatsFile (buildDir, statsFileNameTemplate) {
  buildDir = path.resolve(buildDir)
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
  const rawOutput = await fs.promises.readFile(npmPackJsonPath, { encoding: 'utf-8' })

  // `npm pack` can have lifecycle scripts (e.g. husky's `prepare`) print to
  // stdout ahead of the JSON array despite --ignore-scripts on some npm
  // versions, so only parse the JSON array itself.
  const jsonStart = rawOutput.indexOf('[')
  const jsonEnd = rawOutput.lastIndexOf(']')

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Could not find a JSON array in npm pack output ${npmPackJsonPath}.`)
  }

  const npmPackContent = JSON.parse(rawOutput.slice(jsonStart, jsonEnd + 1))
  const [packageEntry] = npmPackContent

  if (!packageEntry) {
    throw new Error(`No package entry found in npm pack output ${npmPackJsonPath}.`)
  }

  return {
    size: packageEntry.size,
    unpackedSize: packageEntry.unpackedSize
  }
}
