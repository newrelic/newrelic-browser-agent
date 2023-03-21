/**
 * @file Derives a "version" for injection into the bundle. Used to configure Babel for NPM, Webpack, and test server.
 */

const pkg = require('./package.json')
const fs = require('fs')

const VERSION = fs.readFileSync('./VERSION', 'utf-8')

module.exports = ({ source, subversion, isSemver = true } = {}) => {
  setBuildVersion(source, subversion, isSemver)
  setBuildEnv(subversion)
  return [
    'transform-inline-environment-variables',
    {
      include: ['BUILD_VERSION', 'BUILD_ENV']
    }
  ]
}

function setBuildVersion (source, subversion, isSemver) {
  if (!process.env['BUILD_VERSION']) {
    if (source === 'VERSION') process.env['BUILD_VERSION'] = `${VERSION}`
    else if (source && source !== 'PACKAGE') process.env['BUILD_VERSION'] = `${source}`
    else process.env['BUILD_VERSION'] = pkg.version
  }
  if (!isSemver) process.env['BUILD_VERSION'] += `.${subversion || 'LOCAL'}`
  process.env['BUILD_VERSION'] = process.env['BUILD_VERSION']?.replace(/^\s+|\s+$/g, '') || ''
}

function setBuildEnv (subversion) {
  process.env['BUILD_ENV'] = subversion?.replace(/^\s+|\s+$/g, '') || ''
}
