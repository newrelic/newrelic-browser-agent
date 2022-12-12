#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var fs = require('fs')
var path = require('path')
var request = require('request')
var util = require('util')
var yargs = require('yargs')

var argv = yargs
  .string('environments')
  .describe('environments', 'Comma-separated list of environments to upload loaders to')
  .default('environments', 'staging,production,eu')

  .string('production-api-key')
  .describe('production-api-key', 'API key to use for talking to production RPM site to upload loaders')

  .string('staging-api-key')
  .describe('staging-api-key', 'API key to use for talking to staging RPM site to upload loaders')

  .string('eu-api-key')
  .describe('eu-api-key', 'API key to use for talking to EU RPM site to upload loaders')

  .string('version')
  .describe('version', 'Browser Agent version number')

  .boolean('skip-upload-failures')
  .describe('skip-upload-failures', "Don't bail out after the first failure, keep trying other requests")

  .help('h')
  .alias('h', 'help')

  .argv

async function run() {
  var loaders = await loaderFilenames()
  var targetEnvironments = argv.environments.split(',')

  var uploadErrors = []
  var uploadErrorCallback = null
  if (argv['skip-upload-failures']) {
    uploadErrorCallback = function (err) {
      uploadErrors.push(err)
    }
  }

  var fileData = {}

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


  function uploadAllLoadersToDB(environment, cb) {
    asyncForEach(loaders, function (data, next) {
      const filename = Object.keys(data)[0]
      const fileData = data[filename]
      uploadLoaderToDB(filename, fileData, environment, next)
    }, cb, uploadErrorCallback)
  }

  function getFile(path, fileName) {
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

  function uploadLoaderToDB(filename, loader, environment, cb) {
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
    var options = util._extend(envOptions[environment], baseOptions)

    request(options, function (err, res, body) {
      if (err) return cb(err)
      if (res.statusCode === 200) {
        console.log('Uploaded loader version ' + filename + ' to ' + environment)
        return cb()
      }

      cb(new Error('Failed to upload ' + filename + ' loader to ' + environment + ' db: (' + res.statusCode + ') ' + JSON.stringify(body)))
    })
  }

  async function loaderFilenames() {
    const loaderTypes = ['rum', 'full', 'spa']
    const version = argv['version']
    const fileNames = loaderTypes.map(type => [`nr-loader-${type}-${version}.min.js`, `nr-loader-${type}-polyfills-${version}.min.js`]).flat()
    const loaders = (await Promise.all(fileNames.map(fileName => getFile(`https://js-agent.newrelic.com/${fileName}`, fileName)))).map(([url, fileName, body]) => ({ [fileName]: body }))
    return loaders
  }

  // errorCallback is optional
  // If not specified, processing will terminate on the first error.
  // If specified, the errorCallback will be invoked once for each error error,
  // and the done callback will be invoked once each item has been processed.
  function asyncForEach(list, op, done, errorCallback) {
    var index = 0

    process.nextTick(next)

    function next(err) {
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