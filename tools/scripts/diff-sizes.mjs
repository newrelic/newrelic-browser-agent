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
import pkg from '../../package.json' assert { type: 'json' }

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
  workers: [
    { name: 'nr-loader-worker.min', matcher: /nr-loader-worker(?:-\d*?)?\.min\.js/ }
  ],
  npm: [
    { name: 'Browser Agent', matcher: /browser-agent\.js/ },
    { name: 'Custom Lite Agent', matcher: /custom-agent-lite\.js/ },
    { name: 'Custom Pro Agent', matcher: /custom-agent-pro\.js/ },
    { name: 'Custom SPA Agent', matcher: /custom-agent-spa\.js/ },
    { name: 'Worker Agent', matcher: /worker-wrapper\.js/ }
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
  let releaseStatsPath = 'https://nr-browser-agent.s3.amazonaws.com'
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
  const version = pkg.version
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
      diffSizesResults = `+${Math.round(((diffSizes.fileSizePercent - 1) + Number.EPSILON) * 10000) / 100}%`
    } else {
      diffSizesResults = `-${Math.round(((1 - diffSizes.fileSizePercent) + Number.EPSILON) * 10000) / 100}%`
    }
    if (diffSizes.gzipSizePercent > 1) {
      diffSizesResults = `${diffSizesResults} / +${Math.round(((diffSizes.gzipSizePercent - 1) + Number.EPSILON) * 10000) / 100}% (gzip)`
    } else {
      diffSizesResults = `${diffSizesResults} / -${Math.round(((1 - diffSizes.gzipSizePercent) + Number.EPSILON) * 10000) / 100}% (gzip)`
    }

    return `|${assetName.name}|${releaseSizesResult}|${buildSizesResult}|${diffSizesResults}|`
  }).join('\n')
}

function generateOtherDiffRows (assetSizes, buildType, assetGroup) {
  const targetBuildTypeSizes = assetSizes[buildType]
  return Object.keys(targetBuildTypeSizes[assetGroup])
    .filter(assetName => assetName.indexOf('nr-loader') === -1)
    .map(assetName => {
      const buildSizes = targetBuildTypeSizes[assetGroup][assetName]
      const buildSizesResult = `${filesize(buildSizes.fileSize)} / ${filesize(buildSizes.gzipSize)} (gzip)`
      return `|${assetName}|${buildSizesResult}|`
    }).join('\n')
}

async function writeDiff (assetSizes) {
  await fs.ensureDir(config.out)
  await fs.writeJson(path.join(config.out, 'size_report.json'), assetSizes, { spaces: 2 })
  await fs.outputFile(path.join(config.out, 'size_report.md'), `# Asset Size Report
Merging this pull request will result in the following **CDN asset size changes**:

| Asset Name | Previous Size | New Size | Diff |
|------------|---------------|----------|------|
${generateDiffRows(assetSizes, 'standard')}
${generateDiffRows(assetSizes, 'polyfills')}
${generateDiffRows(assetSizes, 'workers')}

Merging this pull request will result in the following **NPM package consumer size changes**:

| Asset Name | Previous Size | New Size | Diff |
|------------|---------------|----------|------|
${generateDiffRows(assetSizes, 'npm')}

<details>
<summary>Other Standard CDN Assets</summary>

## Released Assets

| Asset Name | Asset Size |
|------------|------------|
${generateOtherDiffRows(assetSizes, 'standard', 'releaseStats')}

## Built Assets

| Asset Name | Asset Size |
|------------|------------|
${generateOtherDiffRows(assetSizes, 'standard', 'buildStats')}

</details>

<details>
<summary>Other Polyfill CDN Assets</summary>

## Released Assets

| Asset Name | Asset Size |
|------------|------------|
${generateOtherDiffRows(assetSizes, 'polyfills', 'releaseStats')}

## Built Assets

| Asset Name | Asset Size |
|------------|------------|
${generateOtherDiffRows(assetSizes, 'polyfills', 'buildStats')}

</details>
`
  )
}

Promise.all([
  Promise.all([
    getReleaseSize('standard'),
    getReleaseSize('polyfills'),
    getReleaseSize('workers'),
    getReleaseSize('npm')
  ]),
  Promise.all([
    getBuildSize('standard'),
    getBuildSize('polyfills'),
    getBuildSize('workers'),
    getBuildSize('npm')
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
      workers: {
        releaseStats: releaseStats[2],
        buildStats: buildStats[2]
      },
      npm: {
        releaseStats: releaseStats[3],
        buildStats: buildStats[3]
      }
    }
  })
  .then(writeDiff)
