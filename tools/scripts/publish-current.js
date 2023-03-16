#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Uses the following environment variables:
// AWS_SECRET_ACCESS_KEY
// AWS_ACCESS_KEY_ID

var AWS = require('aws-sdk')
var request = require('request')
var yargs = require('yargs')
var loaders = require('jil/util/loaders.js')
const mime = require('mime-types');

var argv = yargs
  .string('build-number')
  .describe('build-number', 'build number to promote to current')

  .string('bucket')
  .describe('bucket', 'S3 bucket name')

  .string('role')
  .describe('role', 'S3 role ARN')

  .boolean('dry')
  .describe('dry', 'run the script without actually uploading files')
  .alias('d', 'dry')

  .boolean('test')
  .describe('test', 'for testing only, uploads scripts to folder named test')
  .alias('t', 'test')

  .help('h')
  .alias('h', 'help')
  .argv

if (!argv['buildNumber']) {
  console.log('build number must be specified')
  return process.exit(1)
}

if (!argv['bucket']) {
  console.log('S3 bucket must be specified')
  return process.exit(1)
}

if (!argv['role']) {
  console.log('S3 role ARN must be specified')
  return process.exit(1)
}

var s3 = null
var buildNum = argv['build-number']
var bucketName = argv['bucket']

var loaderNames = loaders.map(function (loader) {
  return 'nr-loader-' + loader.name + '-{version}'
})

var payloadNames = loaders.map(function (loader) {
  if (!loader.payload) return 'nr-{version}'
  return 'nr-' + loader.payload + '-{version}'
}).concat([]).filter(unique)

var allNames = loaderNames.concat(payloadNames)

var allFiles = allNames.map(add('.js'))
  .concat(allNames.map(add('.js.map')))
  .concat(allNames.map(add('.min.js')))
  .concat(allNames.map(add('.min.js.map')))
  .concat(allNames.map(add('.stats.json')))
  .concat(allNames.map(add('.stats.html')))

var toGet = allFiles.map(setVersion(buildNum))
var toSet = allFiles.map(setVersion('current'))

console.log('Promoting ' + buildNum + ' to be current')

if (!(+buildNum > 470)) {
  throw new Error('build number must been a recent browser agent version (using buildNum `' + buildNum + '`)')
}

initialize(function(err) {
  if (err) throw err

  toGet.forEach(function (name, idx) {
    request('https://js-agent.newrelic.com/' + name, function (err, req, content) {
      if (err) throw err
      if (!(content.match('NREUM'))) {
        throw new Error('Content is missing NREUM, something went wrong')
      }

      var key = toSet[idx]
      var type = mime.lookup(name) || 'application/javascript'

      uploadToS3(key, content, type, function (e) {
        if (e) throw e
      })
    })
  })
})

function initialize(cb) {
  var roleToAssume = {
    RoleArn: argv['role'],
    RoleSessionName: 'uploadToS3Session',
    DurationSeconds: 900
  }

  var sts = new AWS.STS();
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

function uploadToS3 (key, content, type, cb) {
  if (argv['test'] === true) {
    key = 'test/' + key
  }

  var params = {
    Body: content,
    Bucket: bucketName,
    ContentType: type,
    Key: key
  }

  console.log('Updating: ' + key, 'type: ' + type)

  params.CacheControl = 'public, max-age=0'
  params.Expires = new Date()

  if (argv['dry'] === true) {
    console.log('running in dry mode, file not uploaded')
    process.nextTick(cb)
    return
  }

  s3.putObject(params, cb)
}

function setVersion (version) {
  return function (name) {
    return name.replace('{version}', version)
  }
}

function unique (a, i, list) {
  return list.indexOf(a) === i
}

function add (ext) {
  return function (name) {
    return name + ext
  }
}
