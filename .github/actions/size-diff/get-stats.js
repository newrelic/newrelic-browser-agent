import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import esbuild from 'esbuild'
import { reportSettings } from './report-settings.js'

const RUNTIME_EXTERNALS = ['web-vitals', 'fflate', '@newrelic/rrweb']

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

export async function getInterfaceStats (targetDir) {
  targetDir = path.resolve(targetDir)
  const packageJson = JSON.parse(await fs.promises.readFile(path.join(targetDir, 'package.json'), { encoding: 'utf-8' }))

  const exportEntries = Object.entries(packageJson.exports || {})
    .map(([subpath, condition]) => [subpath, resolveSrcFile(condition)])
    .filter(([, srcFile]) => srcFile && srcFile.startsWith('./src/interfaces/'))

  const results = await Promise.all(exportEntries.map(async ([subpath, srcFile]) => {
    const name = subpath.replace(/^\.\//, '')
    const stats = await bundleAndMeasure(targetDir, srcFile)
    return [name, stats]
  }))

  return results.reduce((aggregator, [name, stats]) => {
    aggregator[name] = stats
    return aggregator
  }, {})
}

function resolveSrcFile (condition) {
  const distFile = condition.default || condition.import || condition.require

  if (!distFile) {
    throw new Error(`Could not resolve a source file for exports condition ${JSON.stringify(condition)}.`)
  }

  return distFile.replace(/^\.\/dist\/(esm|cjs)\//, './src/')
}

async function bundleAndMeasure (targetDir, srcFile) {
  const result = await esbuild.build({
    entryPoints: [srcFile],
    absWorkingDir: targetDir,
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    external: RUNTIME_EXTERNALS
  })

  const outputText = result.outputFiles[0].text
  const fileSize = Buffer.byteLength(outputText, 'utf-8')
  const gzipSize = zlib.gzipSync(outputText).length

  return { fileSize, gzipSize }
}
