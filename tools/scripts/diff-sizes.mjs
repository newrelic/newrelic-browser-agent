#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Compares local build output files with those of a specified release version on CDN and writes JSON and
 * markdown build size reports to a specified directory.
 */

import path from 'path'
import url from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs-extra'
import fetch from 'node-fetch'
import { filesize } from 'filesize'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const reportSettings = {
  standard: [
    { name: 'nr-loader-spa.min', matcher: /nr-loader-spa(?:-\d*?)?\.min\.js/ },
    { name: 'nr-loader-full.min', matcher: /nr-loader-full(?:-\d*?)?\.min\.js/ },
    { name: 'nr-loader-rum.min', matcher: /nr-loader-rum(?:-\d*?)?\.min\.js/ }
  ],
  polyfills: [
    { name: 'nr-loader-spa-polyfills.min', matcher: /nr-loader-spa-polyfills(?:-\d*?)?\.min\.js/ },
    { name: 'nr-loader-full-polyfills.min', matcher: /nr-loader-full-polyfills(?:-\d*?)?\.min\.js/ },
    { name: 'nr-loader-rum-polyfills.min', matcher: /nr-loader-rum-polyfills(?:-\d*?)?\.min\.js/ }
  ],
  worker: [
    { name: 'nr-loader-worker.min', matcher: /nr-loader-worker(?:-\d*?)?\.min\.js/ }
  ]
}

const config = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('r')
  .alias('r', 'release')
  .default('r', 'dev')
  .describe('r', 'release version to compare against, default: dev')

  .string('o')
  .alias('o', 'out')
  .describe('o', 'Outputs results of run into the provide directory path. Writes a json and md file.')

  .argv

function parseBuildStats (buildStats) {
  return buildStats.reduce((agg, statBlock) => {
    agg[statBlock.label] = {
      fileSize: statBlock.parsedSize,
      gzipSize: statBlock.gzipSize
    }

    return agg
  }, {})
}

async function getReleaseSize (buildType) {
  let releaseStatsPath = 'https://js-agent.newrelic.com'
  if (config.release === 'dev') {
    releaseStatsPath += `/dev/${buildType}.stats.json`
  } else {
    releaseStatsPath += `/${buildType}-${config.release}.stats.json`
  }

  const buildStatsFetch = await fetch(releaseStatsPath)
  const buildStats = await buildStatsFetch.json()
  return parseBuildStats(buildStats)
}

async function getBuildSize (buildType) {
  const version = (await fs.readFile(path.resolve(__dirname, '../../VERSION'))).toString().trim()
  let buildStatsPath = path.resolve(__dirname, `../../build/${buildType}-${version}.stats.json`)

  if (!(await fs.pathExists(buildStatsPath))) {
    buildStatsPath = path.resolve(__dirname, `../../build/${buildType}.stats.json`)
  }

  const buildStats = await fs.readJson(buildStatsPath)
  return parseBuildStats(buildStats)
}

function findAssetStats (assetNameMatcher, assetSizes) {
  for (const prop in assetSizes) {
    if (assetNameMatcher.test(prop)) {
      return assetSizes[prop]
    }
  }

  return { fileSize: 0, gzipSize: 0 }
}

function generateDiffRows (assetSizes, buildType) {
  const targetBuildTypeSizes = assetSizes[buildType]
  return reportSettings[buildType].map(assetName => {
    const releaseSizes = findAssetStats(assetName.matcher, targetBuildTypeSizes.releaseStats)
    const buildSizes = findAssetStats(assetName.matcher, targetBuildTypeSizes.buildStats)

    const releaseSizesResult = `${filesize(releaseSizes.fileSize)} / ${filesize(releaseSizes.gzipSize)} (gzip)`
    const buildSizesResult = `${filesize(buildSizes.fileSize)} / ${filesize(buildSizes.gzipSize)} (gzip)`
    const diffSizes = {
      fileSizePercent: buildSizes.fileSize / releaseSizes.fileSize,
      gzipSizePercent: buildSizes.gzipSize / releaseSizes.gzipSize
    }

    let diffSizesResults = ''
    if (diffSizes.fileSizePercent > 1) {
      diffSizesResults = `+${Math.round(((diffSizes.fileSizePercent - 1) + Number.EPSILON) * 10000) / 10000}%`
    } else {
      diffSizesResults = `-${Math.round(((1 - diffSizes.fileSizePercent) + Number.EPSILON) * 10000) / 10000}%`
    }
    if (diffSizes.gzipSizePercent > 1) {
      diffSizesResults = `${diffSizesResults} / + ${Math.round(((diffSizes.gzipSizePercent - 1) + Number.EPSILON) * 10000) / 10000}% (gzip)`
    } else {
      diffSizesResults = `${diffSizesResults} / - ${Math.round(((1 - diffSizes.gzipSizePercent) + Number.EPSILON) * 10000) / 10000}% (gzip)`
    }

    return `|${assetName.name}|${releaseSizesResult}|${buildSizesResult}|${diffSizesResults}|`
  }).join('\n')
}

async function writeDiff (assetSizes) {
  await fs.ensureDir(config.out)
  await fs.writeJson(path.join(config.out, 'size_report.json'), assetSizes, { spaces: 2 })
  await fs.outputFile(path.join(config.out, 'size_report.md'), `# Asset Size Report
Merging this pull request will result in the following asset size changes:

| Asset Name | Previous Size | New Size | Diff |
|------------|---------------|----------|------|
${generateDiffRows(assetSizes, 'standard')}
${generateDiffRows(assetSizes, 'polyfills')}
${generateDiffRows(assetSizes, 'worker')}

<sub>This report only accounts for the minified loaders. Un-minified and async-loaded assets are not included.</sub>
`
  )
}

Promise.all([
  Promise.all([
    getReleaseSize('standard'),
    getReleaseSize('polyfills'),
    getReleaseSize('worker')
  ]),
  Promise.all([
    getBuildSize('standard'),
    getBuildSize('polyfills'),
    getBuildSize('worker')
  ])
])
  .then(([releaseStats, buildStats]) => {
    return {
      standard: {
        releaseStats: releaseStats[0],
        buildStats: buildStats[0]
      },
      polyfills: {
        releaseStats: releaseStats[1],
        buildStats: buildStats[1]
      },
      worker: {
        releaseStats: releaseStats[2],
        buildStats: buildStats[2]
      }
    }
  })
  .then(writeDiff)
