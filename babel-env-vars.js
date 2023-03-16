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
module.exports = (source, subversion) => {
  if (!process.env['BUILD_VERSION']) {
    if (source === 'VERSION') process.env['BUILD_VERSION'] = `${VERSION}.${subversion || 'LOCAL'}`
    else if (source && source !== 'PACKAGE') process.env['BUILD_VERSION'] = `${source}.${subversion || 'LOCAL'}`
    else process.env['BUILD_VERSION'] = pkg.version
  }
  return [
    'transform-inline-environment-variables',
    {
      include: ['BUILD_VERSION']
    }
  ]
}
