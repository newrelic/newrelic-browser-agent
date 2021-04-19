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

  .boolean('skip-upload-failures')
  .describe('skip-upload-failures', "Don't bail out after the first failure, keep trying other requests")

  .help('h')
  .alias('h', 'help')

  .argv

var loaders = loaderFilenames()
var targetEnvironments = argv.environments.split(',')

var uploadErrors = []
var uploadErrorCallback = null
if (argv['skip-upload-failures']) {
  uploadErrorCallback = function (err) {
    uploadErrors.push(err)
  }
}

var fileData = {}
var agentVersion = fs.readFileSync(
  path.resolve(__dirname, '../../build/build_number'),
  'utf-8'
).trim()

var steps = [ loadFiles ]

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

function loadFiles (cb) {
  var allFiles = loaders

  asyncForEach(allFiles, readFile, cb)

  function readFile (file, next) {
    fs.readFile(path.resolve(__dirname, '../../build/', file), function (err, data) {
      if (err) return next(err)
      fileData[file] = data
      next()
    })
  }
}

function getFilenameWithVersion (file, version) {
  var parts = file.split('.')
  var filename = parts[0] + '-' + version + '.' + parts.slice(1).join('.')

  if (argv['test-mode']) {
    filename = filename.replace('nr-', 'test-')
  }

  return filename
}

function uploadAllLoadersToDB (environment, cb) {
  asyncForEach(loaders, function (file, next) {
    var filename = getFilenameWithVersion(file, agentVersion)
    uploadLoaderToDB(filename, fileData[file], environment, next)
  }, cb, uploadErrorCallback)
}

function uploadLoaderToDB (filename, loader, environment, cb) {
  var baseOptions = {
    method: 'PUT',
    followAllRedirects: true,
    json: {
      js_agent_loader: {
        version: filename, // sic
        loader: loader.toString()
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

function loaderFilenames() {
  var loaderSpecs = require('../../loaders')
  var filenames = []

  loaderSpecs.forEach(function (loaderSpec) {
    filenames.push('nr-loader-' + loaderSpec.name + '.js')
    filenames.push('nr-loader-' + loaderSpec.name + '.min.js')
  })

  return filenames
}

// errorCallback is optional
// If not specified, processing will terminate on the first error.
// If specified, the errorCallback will be invoked once for each error error,
// and the done callback will be invoked once each item has been processed.
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
