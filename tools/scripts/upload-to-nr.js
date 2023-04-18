#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var request = require('request')
var yargs = require('yargs')

var argv = yargs
  .string('environments')
  .describe('environments', 'Comma-separated list of environments to upload loaders to')
  .default('environments', 'dev,staging,production,eu')

  .string('production-api-key')
  .describe('production-api-key', 'API key to use for talking to production RPM site to upload loaders')

  .string('staging-api-key')
  .describe('staging-api-key', 'API key to use for talking to staging RPM site to upload loaders')

  .string('eu-api-key')
  .describe('eu-api-key', 'API key to use for talking to EU RPM site to upload loaders')

  .string('v')
  .describe('v', 'Browser Agent version number')

  .boolean('skip-upload-failures')
  .describe('skip-upload-failures', "Don't bail out after the first failure, keep trying other requests")

  .help('h')
  .alias('h', 'help')

  .argv

/**
 * An async wrapper around the execution logic
 * @returns
 */
async function run () {
  var loaders = await loaderFilenames()
  var targetEnvironments = argv.environments.split(',')

  var uploadErrors = []
  var uploadErrorCallback = null
  if (argv['skip-upload-failures']) {
    uploadErrorCallback = function (err) {
      uploadErrors.push(err)
    }
  }

  var steps = []

  targetEnvironments.forEach(function (env) {
    console.log('Will upload loaders to ' + env)
    steps.push(function (cb) {
      uploadAllLoadersToDB(env, cb)
    })
  })

  asyncForEach(steps, function (fn, next) {
    fn(next)
  }, function (err) {
    if (err) throw err
    console.log('All steps finished.')

    if (uploadErrorCallback && uploadErrors.length > 0) {
      console.log('Failures:')
      uploadErrors.forEach(function (e) {
        console.log(e)
      })
      process.exit(1)
    }
  })

  /**
 * Iterate over each environment to upload loaders
 * @param {string} environment
 * @param {Function} cb
 * @returns {void}
 */
  function uploadAllLoadersToDB (environment, cb) {
    asyncForEach(loaders, function (data, next) {
      const filename = Object.keys(data)[0]
      const fileData = data[filename]
      uploadLoaderToDB(filename, fileData, environment, next)
    }, cb, uploadErrorCallback)
  }

  /**
   * Download a file
   * @param {string} path
   * @param {string} fileName
   * @returns {Promise<[string, string, string]>}
   */
  function getFile (path, fileName) {
    var opts = {
      uri: path,
      method: 'GET',
      gzip: true
    }

    console.log('downloading ', path)

    return new Promise((resolve, reject) => {
      request(opts, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          reject(err)
          return
        }
        resolve([path, fileName, body])
      })
    })
  }

  /**
   * Upload a loader to NRDB
   * @param {string} filename
   * @param {string} loader
   * @param {string} environment
   * @param {Function} cb
   */
  function uploadLoaderToDB (filename, loader, environment, cb) {
    var baseOptions = {
      method: 'PUT',
      followAllRedirects: true,
      json: {
        js_agent_loader: {
          version: filename, // sic
          loader
        },
        set_current: false
      }
    }

    var envOptions = {
      dev: {
        url: 'https://science-api-grape.staging-service.newrelic.com/v2/js_agent_loaders/create.json',
        headers: {
          'X-Api-Key': argv['staging-api-key']
        }
      },
      staging: {
        url: 'https://staging-api.newrelic.com/v2/js_agent_loaders/create.json',
        headers: {
          'X-Api-Key': argv['staging-api-key']
        }
      },
      eu: {
        url: 'https://api.eu.newrelic.com/v2/js_agent_loaders/create.json',
        headers: {
          'X-Api-Key': argv['eu-api-key']
        }
      },
      production: {
        url: 'https://api.newrelic.com/v2/js_agent_loaders/create.json',
        headers: {
          'X-Api-Key': argv['production-api-key']
        }
      }
    }

    console.log('Uploading loader ' + filename + ' to ' + environment + '...')
    var options = {
      ...envOptions[environment],
      ...baseOptions
    }

    request(options, function (err, res, body) {
      if (err) return cb(err)
      if (res.statusCode === 200) {
        console.log('Uploaded loader version ' + filename + ' to ' + environment)
        return cb()
      }

      cb(new Error('Failed to upload ' + filename + ' loader to ' + environment + ' db: (' + res.statusCode + ') ' + JSON.stringify(body)))
    })
  }

  /**
   * Fetches an array of loader filenames and contents from the CDN
   * @returns {Promise<{[fileName]: string}[]>} Promise contains an array of objects {[filename]: body} --> {'nr-loader-spa-1221.min.js': ...scriptContents}
   */
  async function loaderFilenames () {
    const loaderTypes = ['rum', 'full', 'spa']
    const version = argv['v']
    const fuzzyVersions = getFuzzyVersions(version)
    const fileNames = loaderTypes.map(type => [
      `nr-loader-${type}-${version}.min.js`,
      `nr-loader-${type}-polyfills-${version}.min.js`,
      `nr-loader-${type}-${version}.js`,
      `nr-loader-${type}-polyfills-${version}.js`,
      // fuzzy
      `nr-loader-${type}-${fuzzyVersions.MINOR}.min.js`,
      `nr-loader-${type}-polyfills-${fuzzyVersions.MINOR}.min.js`,
      `nr-loader-${type}-${fuzzyVersions.PATCH}.min.js`,
      `nr-loader-${type}-polyfills-${fuzzyVersions.PATCH}.min.js`,
      `nr-loader-${type}-${fuzzyVersions.MINOR}.js`,
      `nr-loader-${type}-polyfills-${fuzzyVersions.MINOR}.js`,
      `nr-loader-${type}-${fuzzyVersions.PATCH}.js`,
      `nr-loader-${type}-polyfills-${fuzzyVersions.PATCH}.js`
    ]).flat()
    return (await Promise.all(fileNames.map(fileName => getFile(`https://js-agent.newrelic.com/${fileName}`, fileName)))).map(([url, fileName, body]) => ({ [fileName]: body }))
  }

  function getFuzzyVersions (version) {
    const pieces = version.split('.')
    return {
      MAJOR: 'x.x.x',
      MINOR: `${pieces[0]}.x.x`,
      PATCH: `${pieces[0]}.${pieces[1]}.x`
    }
  }

  /**
   * @param {Array<Function>} list - Array of functions to execute
   * @param {Function} op - operator cb
   * @param {Function} done - terminal cb
   * @param {Function=} errorCallback - If not specified, processing will terminate on the first error. If specified, the errorCallback will be invoked once for each error error, and the done callback will be invoked once each item has been processed.
  */
  function asyncForEach (list, op, done, errorCallback) {
    var index = 0

    process.nextTick(next)

    function next (err) {
      if (err) {
        if (errorCallback) {
          errorCallback(err)
        } else {
          return done(err)
        }
      }

      if (index >= list.length) return done(null)
      op(list[index++], function (err, result) {
        next(err)
      })
    }
  }
}

run()
