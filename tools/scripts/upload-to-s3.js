#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var fs = require('fs')
var path = require('path')
var AWS = require('aws-sdk')
var yargs = require('yargs')

var argv = yargs
  .string('bucket')
  .describe('bucket', 'S3 bucket name')

  .string('role')
  .describe('role', 'S3 role ARN')

  .boolean('skip-upload-failures')
  .describe('skip-upload-failures', "Don't bail out after the first failure, keep trying other requests")

  .boolean('dry')
  .describe('dry', 'run the script without actually uploading files')
  .alias('d', 'dry')

  .boolean('test')
  .describe('test', 'for testing only, uploads scripts to folder named test')
  .alias('t', 'test')

  .boolean('dev')
  .describe('dev', 'for dev early release directory only, uploads scripts to folder named dev')
  .alias('D', 'dev')

  .help('h')
  .alias('h', 'help')

  .argv

if (!argv['bucket']) {
  console.log('S3 bucket must be specified')
  return process.exit(1)
}

if (!argv['role']) {
  console.log('S3 role ARN must be specified')
  return process.exit(1)
}

var assetFilenames = allAssetFilenames()
var loaders = assetFilenames.loaders
var payloads = assetFilenames.payloads
var maps = assetFilenames.maps

var s3 = null
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

var steps = [ initialize, loadFiles ]
steps.push(uploadAllToS3)

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

function initialize(cb) {
  var roleToAssume = {
    RoleArn: argv['role'],
    RoleSessionName: 'uploadToS3Session',
    DurationSeconds: 900
  }

  var sts = new AWS.STS()
  sts.assumeRole(roleToAssume, function(err, data) {
    if (err) {
      return cb(err)
    } else {
      var roleCreds = {
        accessKeyId: data.Credentials.AccessKeyId,
        secretAccessKey: data.Credentials.SecretAccessKey,
        sessionToken: data.Credentials.SessionToken
      }
      s3 = new AWS.S3(roleCreds)
      cb()
    }
  })
}

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
    uploadToS3(argv['bucket'], filename, fileData[file], next)
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

function uploadToS3 (bucket, key, content, cb) {
  if (argv['test'] === true) {
    key = 'test/' + key
  }

  if (argv['dev'] === true) {
    key = 'dev/' + key
  }

  var params = {
    Body: content,
    Bucket: bucket,
    ContentType: 'application/javascript',
    CacheControl: 'public, max-age=3600',
    Key: key
  }

  if (argv['dry'] === true) {
    console.log('running in dry mode, file not uploaded, params:', params)
    process.nextTick(cb)
    return
  }

  s3.putObject(params, cb)
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
