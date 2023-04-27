#!/usr/bin/env node

const path = require('path')
const fs = require('fs-extra')

;(async () => {
  const { gzipSizeFromFileSync } = await import('gzip-size')

  const npmWrapperBuildDir = path.resolve(__dirname, '../../tests/assets/test-builds/browser-agent-wrapper')
  const npmWrapperFiles = fs.readdirSync(npmWrapperBuildDir, { withFileTypes: true })
    .filter(item => item.isFile() && item.name.endsWith('.js'))
    .map(item => ({
      label: item.name,
      parsedSize: fs.statSync(path.join(npmWrapperBuildDir, item.name)).size,
      gzipSize: gzipSizeFromFileSync(path.join(npmWrapperBuildDir, item.name))
    }))

  fs.writeJson(path.resolve(__dirname, '../../build/npm.stats.json'), npmWrapperFiles)
})()
