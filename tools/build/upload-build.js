#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var AWS = require('aws-sdk')
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

  .string('local-api-key')
  .describe('local-api-key', 'API key to use for talking to local RPM site to upload loaders')

  .boolean('skip-upload-failures')
  .describe('skip-upload-failures', "Don't bail out after the first failure, keep trying other requests")

  .boolean('skip-s3')
  .describe('skip-s3', 'Skip uploading to S3 (only upload loaders to the DB)')
  .default('skip-s3', false)

  .help('h')
  .alias('h', 'help')

  .argv

var s3 = new AWS.S3()

var assetFilenames = allAssetFilenames()
var loaders = assetFilenames.loaders
var payloads = assetFilenames.payloads
var maps = assetFilenames.maps
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

if (argv.skipS3) {
  console.log('Skipping uploads to S3')
} else {
  console.log('Will upload assets to S3')
  steps.push(uploadAllToS3)
}

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
  var allFiles = payloads.concat(loaders).concat(maps)

  asyncForEach(allFiles, readFile, cb)

  function readFile (file, next) {
    fs.readFile(path.resolve(__dirname, '../../build/', file), function (err, data) {
      if (err) return next(err)
      fileData[file] = data
      next()
    })
  }
}

function uploadAllToS3 (cb) {
  var allFiles = payloads.concat(loaders).concat(maps)

  asyncForEach(allFiles, function (file, next) {
    var filename = getFilenameWithVersion(file, agentVersion)
    console.log('uploading ' + filename + ' to S3')
    uploadToS3(filename, fileData[file], next)
  }, cb, uploadErrorCallback)
}

function getFilenameWithVersion (file, version) {
  var parts = file.split('.')
  return parts[0] + '-' + version + '.' + parts.slice(1).join('.')
}

function uploadAllLoadersToDB (environment, cb) {
  asyncForEach(loaders, function (file, next) {
    var filename = getFilenameWithVersion(file, agentVersion)
    uploadLoaderToDB(filename, fileData[file], environment, next)
  }, cb, uploadErrorCallback)
}

function uploadToS3 (key, content, cb) {
  var params = {
    Body: content,
    Bucket: 'nr-browser-agent',
    ContentType: 'application/javascript',
    CacheControl: 'public, max-age=3600',
    Key: key
  }

  s3.putObject(params, cb)
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
// These should be turned into env vars in GH actions
  var envOptions = {
    local: {
      url: 'http://api.lvh.me:3000/v2/js_agent_loaders/create.json',
      headers: {
        'X-Api-Key': argv['local-api-key']
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

function allAssetFilenames () {
  var loaderSpecs = require('../../loaders')
  var loaders = []
  var payloads = []
  var maps = []

  loaderSpecs.forEach(function (loaderSpec) {
    loaders.push('nr-loader-' + loaderSpec.name + '.js')
    loaders.push('nr-loader-' + loaderSpec.name + '.min.js')
    maps.push('nr-loader-' + loaderSpec.name + '.js.map')
    maps.push('nr-loader-' + loaderSpec.name + '.min.js.map')

    var payloadName = loaderSpec.payload ? 'nr-' + loaderSpec.payload : 'nr'
    if (payloads.indexOf(payloadName + '.js') === -1) {
      payloads.push(payloadName + '.js')
      payloads.push(payloadName + '.min.js')
      maps.push(payloadName + '.js.map')
      maps.push(payloadName + '.min.js.map')
    }
  })

  return {
    loaders: loaders,
    payloads: payloads,
    maps: maps
  }
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
