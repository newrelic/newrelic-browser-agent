const core = require('@actions/core')
const pkg = require('../../package.json')
const path = require('path')
const fs = require('fs')

const CDN_VERSION = fs.readFileSync(path.join(__dirname, '../../VERSION'), 'utf-8')

core.setOutput('PACKAGE_VERSION', pkg.version)
core.setOutput('CDN_VERSION', CDN_VERSION)
