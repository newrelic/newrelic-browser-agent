/**
 * @file Derives a "version" for injection into the bundle. Used to configure Babel for NPM, Webpack, and test server.
 */

const pkg = require('./package.json')
const fs = require('fs')

const VERSION = fs.readFileSync('./VERSION', 'utf-8')

/*
 * Version injection is currently complicated by the fact that NPM will build with package.json.version while CDN will
 * build with the value in the VERSION file, as well as subversion attributes such as PROD, DEV, LOCAL, etc. Once
 * aligned, this process will be simpler.
 */

/**
 * Derives a build version based on the specified source and subversion and assigns the value to a process environment
 * variable called `BUILD_VERSION`.
 * @param {string} source - The desired source of the version number. Can be `VERSION` or `PACKAGE`.
 * @param {string} subversion - A build classification suffix (e.g. `PROD` or a PR number).
 * @returns {Array} - A configuration array with plugin configuration for
 *     `babel-plugin-transform-inline-environment-variables`.
 * @see https://babeljs.io/docs/en/babel-plugin-transform-inline-environment-variables
 */
module.exports = ({ source, subversion, isSemver = true, distMethod = 'CDN' } = {}) => {
  const envVarNames = []
  envVarNames.push(setBuildVersion(source, subversion, isSemver))
  envVarNames.push(setBuildEnv(subversion))
  envVarNames.push(setDistMethod(distMethod))
  return [
    'transform-inline-environment-variables',
    {
      include: envVarNames
    }
  ]
}

function setBuildVersion (source, subversion, isSemver) {
  const name = 'BUILD_VERSION'
  if (!process.env[name]) {
    if (source === 'VERSION') process.env[name] = `${VERSION}`
    else if (source && source !== 'PACKAGE') process.env[name] = `${source}`
    else process.env[name] = pkg.version
  }
  if (!isSemver) process.env[name] += `.${subversion || 'LOCAL'}`
  process.env[name] = process.env[name]?.replace(/^\s+|\s+$/g, '') || ''
  return name
}

function setBuildEnv (subversion) {
  process.env['BUILD_ENV'] = subversion?.replace(/^\s+|\s+$/g, '') || ''
  return 'BUILD_ENV'
}

function setDistMethod (distMethod) {
  const name = 'DIST_METHOD'
  process.env[name] = distMethod || ''
  return name
}
