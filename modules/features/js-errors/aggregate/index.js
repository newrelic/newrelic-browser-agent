/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {canonicalFunctionName} from './canonical-function-name'
import {computeStackTrace} from './compute-stack-trace'
import {stringHashCode} from './string-hash-code'
import { truncateSize } from './format-stack-trace'

import * as agg from '../../../common/aggregate/aggregator'
import { registerHandler as register, global } from '../../../common/event-emitter/register-handler'
import { on } from '../../../common/harvest/harvest'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { stringify } from '../../../common/util/stringify'
import { handle } from '../../../common/event-emitter/handle'
import { mapOwn } from '../../../common/util/map-own'
import { getInfo, getConfigurationValue, runtime } from '../../../common/config/config'
import { now } from '../../../common/timing/now'
import { ee as baseEE } from '../../../common/event-emitter/contextual-ee'
import { cleanURL } from '../../../common/url/clean-url'

console.log('err-aggregate module has been imported!')
var stackReported = {}
var pageviewReported = {}
var errorCache = {}
var currentBody

// Make sure loader.offset is as accurate as possible
// require('../../../agent/start-time')

var errorOnPage = false

// ee.on('feat-err', initialize)

// export default {
//   initialize: initialize,
//   storeError: storeError
// }

export function initialize(captureGlobal) {
  console.log('errors has been initialized!')
  register('err', storeError)
  register('ierr', storeError)

  if (captureGlobal) {
    global('err', storeError)
    global('ierr', storeError)
  }

  var harvestTimeSeconds = getConfigurationValue('jserrors.harvestTimeSeconds') || 10

  on('jserrors', onHarvestStarted)
  var scheduler = new HarvestScheduler('jserrors', { onFinished: onHarvestFinished })
  scheduler.startTimer(harvestTimeSeconds)
}

function onHarvestStarted(options) {
  console.log('onHarvestStarted!')
  var body = agg.take([ 'err', 'ierr' ])

  if (options.retry) {
    currentBody = body
  }

  var payload = { body: body, qs: {} }
  var releaseIds = stringify(runtime.releaseIds)

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
  var cleanedOrigin = cleanURL(runtime.origin)

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

export function storeError (err, time, internal, customAttributes) {
  // are we in an interaction
  time = time || now()
  if (!internal && runtime.onerror && runtime.onerror(err)) return

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
  params.releaseIds = stringify(runtime.releaseIds)

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
    var att = getInfo().jsAttributes
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
