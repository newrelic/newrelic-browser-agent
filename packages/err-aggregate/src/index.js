/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var agg = require('nr-browser-core').internal.aggregator
var canonicalFunctionName = require('./canonical-function-name')
var cleanURL = require('nr-browser-common').cleanUrl
var computeStackTrace = require('./compute-stack-trace')
var stringHashCode = require('./string-hash-code')
var ee = baseEE = require('nr-browser-common').ee
var register = require('nr-browser-core').internal.registerHandler
var harvest = require('nr-browser-core').internal.harvest
var HarvestScheduler = require('nr-browser-core').internal.harvestScheduler
var stringify = require('nr-browser-core').internal.stringify
var handle = require('nr-browser-common').handle
var mapOwn = require('nr-browser-common').mapOwn
var config = require('nr-browser-common').config
var truncateSize = require('./format-stack-trace').truncateSize
var now = require('nr-browser-common').now

var stackReported = {}
var pageviewReported = {}
var errorCache = {}
var currentBody

// Make sure loader.offset is as accurate as possible
// require('../../../agent/start-time')

var errorOnPage = false

// ee.on('feat-err', initialize)

module.exports = {
  initialize: initialize,
  storeError: storeError
}

function initialize(captureGlobal) {
  register('err', storeError)
  register('ierr', storeError)

  if (captureGlobal) {
    register.global('err', storeError)
    register.global('ierr', storeError)
  }

  var harvestTimeSeconds = config.getConfigurationValue('jserrors.harvestTimeSeconds') || 60

  harvest.on('jserrors', onHarvestStarted)
  var scheduler = new HarvestScheduler('jserrors', { onFinished: onHarvestFinished })
  scheduler.startTimer(harvestTimeSeconds)
}

function onHarvestStarted(options) {
  var body = agg.take([ 'err', 'ierr' ])

  if (options.retry) {
    currentBody = body
  }

  var payload = { body: body, qs: {} }
  var releaseIds = stringify(config.runtime.releaseIds)

  if (releaseIds !== '{}') {
    payload.qs.ri = releaseIds
  }

  if (body && body.err && body.err.length && !errorOnPage) {
    payload.qs.pve = '1'
    errorOnPage = true
  }
  return payload
}

function onHarvestFinished(result) {
  if (result.retry && currentBody) {
    mapOwn(currentBody, function(key, value) {
      for (var i = 0; i < value.length; i++) {
        var bucket = value[i]
        var name = getBucketName(bucket.params, bucket.custom)
        agg.merge(key, name, bucket.metrics, bucket.params, bucket.custom)
      }
    })
    currentBody = null
  }
}

function nameHash (params) {
  return stringHashCode(params.exceptionClass) ^ params.stackHash
}

function getBucketName(params, customParams) {
  return nameHash(params) + ':' + stringHashCode(stringify(customParams))
}

function canonicalizeURL (url, cleanedOrigin) {
  if (typeof url !== 'string') return ''

  var cleanedURL = cleanURL(url)
  if (cleanedURL === cleanedOrigin) {
    return '<inline>'
  } else {
    return cleanedURL
  }
}

function buildCanonicalStackString (stackInfo, cleanedOrigin) {
  var canonicalStack = ''

  for (var i = 0; i < stackInfo.frames.length; i++) {
    var frame = stackInfo.frames[i]
    var func = canonicalFunctionName(frame.func)

    if (canonicalStack) canonicalStack += '\n'
    if (func) canonicalStack += func + '@'
    if (typeof frame.url === 'string') canonicalStack += frame.url
    if (frame.line) canonicalStack += ':' + frame.line
  }

  return canonicalStack
}

// Strip query parameters and fragments from the stackString property of the
// given stackInfo, along with the 'url' properties of each frame in
// stackInfo.frames.
//
// Any URLs that are equivalent to the cleaned version of the origin will also
// be replaced with the string '<inline>'.
//
function canonicalizeStackURLs (stackInfo) {
  // Currently, loader.origin might contain a fragment, but we don't want to use it
  // for comparing with frame URLs.
  var cleanedOrigin = cleanURL(config.runtime.origin)

  for (var i = 0; i < stackInfo.frames.length; i++) {
    var frame = stackInfo.frames[i]
    var originalURL = frame.url
    var cleanedURL = canonicalizeURL(originalURL, cleanedOrigin)
    if (cleanedURL && cleanedURL !== frame.url) {
      frame.url = cleanedURL
      stackInfo.stackString = stackInfo.stackString.split(originalURL).join(cleanedURL)
    }
  }

  return stackInfo
}

function storeError (err, time, internal, customAttributes) {
  // are we in an interaction
  time = time || now()
  if (!internal && config.runtime.onerror && config.runtime.onerror(err)) return

  var stackInfo = canonicalizeStackURLs(computeStackTrace(err))
  var canonicalStack = buildCanonicalStackString(stackInfo)

  var params = {
    stackHash: stringHashCode(canonicalStack),
    exceptionClass: stackInfo.name,
    request_uri: window.location.pathname
  }
  if (stackInfo.message) {
    params.message = '' + stackInfo.message
  }

  if (!stackReported[params.stackHash]) {
    stackReported[params.stackHash] = true
    params.stack_trace = truncateSize(stackInfo.stackString)
  } else {
    params.browser_stack_hash = stringHashCode(stackInfo.stackString)
  }
  params.releaseIds = stringify(config.runtime.releaseIds)

  // When debugging stack canonicalization/hashing, uncomment these lines for
  // more output in the test logs
  // params.origStack = err.stack
  // params.canonicalStack = canonicalStack

  var hash = nameHash(params)

  if (!pageviewReported[hash]) {
    params.pageview = 1
    pageviewReported[hash] = true
  }

  var type = internal ? 'ierr' : 'err'
  var newMetrics = { time: time }

  // stn and spa aggregators listen to this event - stn sends the error in its payload,
  // and spa annotates the error with interaction info
  handle('errorAgg', [type, hash, params, newMetrics])

  if (params._interactionId != null) {
    // hold on to the error until the interaction finishes
    errorCache[params._interactionId] = errorCache[params._interactionId] || []
    errorCache[params._interactionId].push([type, hash, params, newMetrics, att, customAttributes])
  } else {
    // store custom attributes
    var customParams = {}
    var att = config.getInfo().jsAttributes
    mapOwn(att, setCustom)
    if (customAttributes) {
      mapOwn(customAttributes, setCustom)
    }

    var jsAttributesHash = stringHashCode(stringify(customParams))
    var aggregateHash = hash + ':' + jsAttributesHash
    agg.store(type, aggregateHash, params, newMetrics, customParams)
  }

  function setCustom (key, val) {
    customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
  }
}

baseEE.on('interactionSaved', function (interaction) {
  if (!errorCache[interaction.id]) return

  errorCache[interaction.id].forEach(function (item) {
    var customParams = {}
    var globalCustomParams = item[4]
    var localCustomParams = item[5]

    mapOwn(globalCustomParams, setCustom)
    mapOwn(interaction.root.attrs.custom, setCustom)
    mapOwn(localCustomParams, setCustom)

    var params = item[2]
    params.browserInteractionId = interaction.root.attrs.id
    delete params._interactionId

    if (params._interactionNodeId) {
      params.parentNodeId = params._interactionNodeId.toString()
      delete params._interactionNodeId
    }

    var hash = item[1] + interaction.root.attrs.id
    var jsAttributesHash = stringHashCode(stringify(customParams))
    var aggregateHash = hash + ':' + jsAttributesHash

    agg.store(item[0], aggregateHash, params, item[3], customParams)

    function setCustom (key, val) {
      customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  })
  delete errorCache[interaction.id]
})

baseEE.on('interactionDiscarded', function (interaction) {
  if (!errorCache[interaction.id]) return

  errorCache[interaction.id].forEach(function (item) {
    var customParams = {}
    var globalCustomParams = item[4]
    var localCustomParams = item[5]

    mapOwn(globalCustomParams, setCustom)
    mapOwn(interaction.root.attrs.custom, setCustom)
    mapOwn(localCustomParams, setCustom)

    var params = item[2]
    delete params._interactionId
    delete params._interactionNodeId

    var hash = item[1]
    var jsAttributesHash = stringHashCode(stringify(customParams))
    var aggregateHash = hash + ':' + jsAttributesHash

    agg.store(item[0], aggregateHash, item[2], item[3], customParams)

    function setCustom (key, val) {
      customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  })
  delete errorCache[interaction.id]
})
