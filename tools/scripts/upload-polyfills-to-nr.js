#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var fs = require('fs')
var path = require('path')
var request = require('request')
var yargs = require('yargs')
const { deepmerge } = require('deepmerge-ts')

var argv = yargs
  .string('environments')
  .describe('environments', 'Comma-separated list of environments to upload loaders to')
  .default('environments', 'staging,production')

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

var loaders = []
var fileData = {}

let checked = 0
let v = 1184
let proms = []
let types = ['rum', 'full', 'spa']
while (v++ < 1216) {
  types.forEach(t => {
    proms.push(getFile(`https://js-agent.newrelic.com/nr-loader-${t}-${v}.min.js`))
    proms.push(getFile(`https://js-agent.newrelic.com/nr-loader-${t}-${v}.js`))
    checked += 2
  })
}

Promise.all(proms).then((files) => {
  console.log(files.length, 'files', ', checked:', checked)
  files.forEach(f => {
    const [url, res, body] = f
    if (res.statusCode !== 200) console.log('res status was not 200...', res.statusCode, url)
    else {
      const uploadUrl = url.split('.com/')[1].split('-').map(x => isNaN(Number(x.substr(0, 4))) ? x : ['polyfills', x]).flat().join('-')
      loaders.push(uploadUrl)
      fileData[uploadUrl] = body
    }
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
})

function getFile (path) {
  var url = path
  var opts = {
    uri: url,
    method: 'GET',
    gzip: true
  }

  console.log('checking ', url)

  return new Promise((resolve, reject) => {
    request(opts, (err, res, body) => {
      if (err) {
        reject(err)
        return
      }
      resolve([url, res, body])
    })
  })
}

var targetEnvironments = argv.environments.split(',')

var uploadErrors = []
var uploadErrorCallback = null
uploadErrorCallback = function (err) {
  uploadErrors.push(err)
}

var steps = []

targetEnvironments.forEach(function (env) {
  console.log('Will upload loaders to ' + env)
  steps.push(function (cb) {
    uploadAllLoadersToDB(env, cb)
  })
})

function loadFiles (cb) {
  var allFiles = loaders

  asyncForEach(allFiles, readFile, cb)

  function readFile (file, next) {
    fs.readFile(path.resolve(__dirname, '../../dist/cdn/', file), function (err, data) {
      if (err) return next(err)
      fileData[file] = data
      next()
    })
  }
}

function uploadAllLoadersToDB (environment, cb) {
  asyncForEach(loaders, function (filename, next) {
    uploadLoaderToDB(filename, fileData[filename], environment, next)
  }, cb, uploadErrorCallback)
}

function uploadLoaderToDB (filename, loader, environment, cb) {
  var baseOptions = {
    method: 'PUT',
    followAllRedirects: true,
    json: {
      js_agent_loader: {
        version: filename, // sic
        loader: loader
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
        'Api-Key': argv['eu-api-key']
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
  var options = deepmerge(baseOptions, envOptions[environment])

  request(options, function (err, res, body) {
    if (err) return cb(err)
    if (res.statusCode === 200) {
      console.log('Uploaded loader version ' + filename + ' to ' + environment)
      return cb()
    }

    cb(new Error('Failed to upload ' + filename + ' loader to ' + environment + ' db: (' + res.statusCode + ') ' + JSON.stringify(body)))
  })
}

function loaderFilenames () {
  const buildDir = path.resolve(__dirname, '../../dist/cdn/')
  return fs.readdirSync(buildDir).filter(x => x.startsWith('nr-loader') && x.endsWith('.js'))
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
