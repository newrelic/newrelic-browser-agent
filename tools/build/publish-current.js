#!/usr/bin/env node

// Uses the following environment variables:
// BUILD_SELECTOR
// AWS_SECRET_ACCESS_KEY
// AWS_ACCESS_KEY_ID

var AWS = require('aws-sdk')
var request = require('request')
var loaders = require('../../loaders.js')
var s3 = new AWS.S3()
var buildNum = process.env['BUILD_SELECTOR']

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

var toGet = allFiles.map(setVersion(buildNum))
var toSet = allFiles.map(setVersion('current'))

console.log('Promoting ' + buildNum + ' to be current')

if (!(+buildNum > 470)) {
  throw new Error('BUILD_SELECTOR must been a recent browser agent version (using buildNum `' + buildNum + '`)')
}

toGet.forEach(function (name, idx) {
  request('https://js-agent.newrelic.com/' + name, function (err, req, content) {
    if (err) throw err
    if (!(content.match('NREUM'))) {
      throw new Error('Content is missing NREUM, something went wrong')
    }

    var key = toSet[idx]
    var type = 'application/javascript'

    uploadToS3(key, content, type, function (e) {
      if (e) throw e
    })
  })
})

function uploadToS3 (key, content, type, cb) {
  var params = {
    ACL: 'public-read',
    Body: content,
    Bucket: 'nr-browser-agent',
    ContentType: type,
    Key: key
  }

  console.log('Updating: ' + key, 'type: ' + type)

  params.CacheControl = 'public, max-age=0'
  params.Expires = new Date()

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
