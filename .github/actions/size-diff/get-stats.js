import fs from 'fs'
import path from 'path'
import url from 'url'
import { v4 as uuidv4 } from 'uuid'
import { reportSettings } from './report-settings.js'
import { fetchRetry } from '@newrelic/browser-agent.actions.shared-utils/fetch-retry.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export async function getAllVersionStats (version) {
  return (await Promise.all(
    Object.entries(reportSettings)
      .map(([name, reportSetting]) =>
        getStats(version, reportSetting)
          .then(stats => ([name, stats]))
      )
  )).reduce((aggregator, [name, stats]) => {
    aggregator[name] = stats
    return aggregator
  }, {})
}

async function getStats (version, reportSetting) {
  if (version === 'local') {
    return await getLocalStats(reportSetting)
  }

  if (version === 'dev') {
    return await getDevStats(reportSetting)
  }

  return getVersionedStats(version, reportSetting)
}

async function getLocalStats (reportSetting) {
  const statsFileName = await findLocalStatsFile(reportSetting.statsFileNameTemplate)
  const statsFileContent = JSON.parse(await fs.promises.readFile(statsFileName))

  return parseStatsFile(reportSetting, statsFileContent)
}

async function getDevStats (reportSetting) {
  const statsFileName = reportSetting.statsFileNameTemplate.replace('{{version}}', '')

  try {
    const statsFileRequest = await fetchRetry(`https://js-agent.newrelic.com/dev/${statsFileName}?_nocache=${uuidv4()}`, { retry: 3 })

    const statsFileContent = await statsFileRequest.json()
    return parseStatsFile(reportSetting, statsFileContent)
  } catch (error) {
    console.error(error.message)
    throw new Error(`Could not retrieve dev stats file ${statsFileName}`)
  }
}

async function getVersionedStats (version, reportSetting) {
  const statsFileName = reportSetting.statsFileNameTemplate.replace('{{version}}', `-${version}`)

  try {
    const statsFileRequest = await fetchRetry(`https://js-agent.newrelic.com/${statsFileName}?_nocache=${uuidv4()}`, { retry: 3 })

    const statsFileContent = await statsFileRequest.json()
    return parseStatsFile(reportSetting, statsFileContent)
  } catch (error) {
    console.error(error.message)
    throw new Error(`Could not retrieve stats file ${statsFileName}`)
  }

}

function parseStatsFile (reportSetting, statsFileContent) {
  let results = {}
  for (const assetSetting of reportSetting.assetFileNameTemplates) {
    const assetFileName = assetSetting.fileNameTemplate.split('{{version}}')
    const assetFileStats = statsFileContent.find(stats =>
      stats.label.startsWith(assetFileName[0]) && stats.label.endsWith(assetFileName[1])
    )

    if (!assetFileStats) {
      throw new Error(`No stats exist matching pattern ${assetSetting.fileNameTemplate}.`)
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
  const buildFiles = await fs.promises.readdir(buildDir, { withFileTypes: true})

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
