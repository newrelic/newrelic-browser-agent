/* eslint-disable no-case-declarations */
import packageJSON from '../../package.json' assert { type: 'json' }
import process from 'process'

/**
 * @typedef {import('./index.mjs').WebpackBuildOptions} WebpackBuildOptions
 */

/**
 * Sets environment variables for the current webpack build.
 * @param {WebpackBuildOptions} env Build variables passed into the webpack cli
 * using --env foo=bar --env biz=baz
 * @param {object} param1 Webpack cli options
 * @param {string} param1.mode The mode options passed to webpack
 * using --mode production
 */
export default async (env) => {
  let VERSION, PATH_VERSION, SUBVERSION, PUBLIC_PATH
  VERSION = packageJSON.version

  switch ((env.mode || '').toString().toLocaleLowerCase()) {
    case 'prod':
    case 'production':
      PATH_VERSION = `-${VERSION}`
      SUBVERSION = 'PROD'
      PUBLIC_PATH = 'https://js-agent.newrelic.com/'
      break
    case 'dev':
    case 'development':
      PATH_VERSION = ''
      SUBVERSION = 'DEV'
      PUBLIC_PATH = 'https://js-agent.newrelic.com/dev/'
      VERSION = `${VERSION}-dev`
      break
    case 'experiment':
      const branchName = env.branchName || 'experiment'
      PATH_VERSION = ''
      SUBVERSION = branchName
      PUBLIC_PATH = `https://js-agent.newrelic.com/experiments/${branchName}/`
      VERSION = `${VERSION}-${branchName.toLowerCase()}`
      break
    default:
      env.mode = 'local'
      PATH_VERSION = ''
      SUBVERSION = 'LOCAL'
      PUBLIC_PATH = '/build/'
      break
  }

  if (env.pathVersion) {
    PATH_VERSION = env.pathVersion
  }
  if (env.subversion) {
    SUBVERSION = env.subversion
  }
  if (env.publicPath) {
    PUBLIC_PATH = env.publicPath
  }
  if (env.version) {
    VERSION = env.version
  }

  console.log('===Setting Webpack Build Environment===')
  console.log(`mode=${env.mode}`)
  console.log(`PATH_VERSION=${PATH_VERSION}`)
  console.log(`SUBVERSION=${SUBVERSION}`)
  console.log(`PUBLIC_PATH=${PUBLIC_PATH}`)
  console.log(`VERSION=${VERSION}`)

  env.PATH_VERSION = PATH_VERSION
  env.SUBVERSION = SUBVERSION
  env.PUBLIC_PATH = PUBLIC_PATH
  env.VERSION = VERSION

  process.env.PATH_VERSION = PATH_VERSION
  process.env.SUBVERSION = SUBVERSION
  process.env.PUBLIC_PATH = PUBLIC_PATH
  process.env.VERSION = VERSION

  // These values are used in babel to replace ENV variables in src/common/constants/env.cdn.js
  process.env.BUILD_VERSION = VERSION
  process.env.BUILD_ENV = SUBVERSION

  if ((process.env.COVERAGE || 'false').toLowerCase() === 'true' || env.coverage === true || (env.coverage || 'false').toLowerCase() === 'true') {
    console.log('Enabling istanbul instrumentation')
    env.coverage = process.env.COVERAGE = true
  } else {
    env.coverage = process.env.COVERAGE = false
  }
}
