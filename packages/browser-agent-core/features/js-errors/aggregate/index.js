/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { canonicalFunctionName } from './canonical-function-name'
import { computeStackTrace } from './compute-stack-trace'
import { stringHashCode } from './string-hash-code'
import { truncateSize } from './format-stack-trace'

import { registerHandler as register } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { stringify } from '../../../common/util/stringify'
import { handle } from '../../../common/event-emitter/handle'
import { mapOwn } from '../../../common/util/map-own'
import { getInfo, getConfigurationValue, getRuntime } from '../../../common/config/config'
import { now } from '../../../common/timing/now'
import { cleanURL } from '../../../common/url/clean-url'
import { FeatureBase } from '../../../common/util/feature-base'

export class Aggregate extends FeatureBase {
  constructor(agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator)
    this.stackReported = {}
    this.pageviewReported = {}
    this.errorCache = {}
    this.currentBody

    this.errorOnPage = false

    // this will need to change to match whatever ee we use in the instrument
    this.ee.on('interactionSaved', function (interaction) {
      if (!this.errorCache[interaction.id]) return

      this.errorCache[interaction.id].forEach(function (item) {
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

        this.aggregator.store(item[0], aggregateHash, params, item[3], customParams)

        function setCustom(key, val) {
          customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
        }
      })
      delete this.errorCache[interaction.id]
    })

    // this will need to change to match whatever ee we use in the instrument
    this.ee.on('interactionDiscarded', function (interaction) {
      if (!this.errorCache || !this.errorCache[interaction.id]) return

      this.errorCache[interaction.id].forEach(function (item) {
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

        this.aggregator.store(item[0], aggregateHash, item[2], item[3], customParams)

        function setCustom(key, val) {
          customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
        }
      })
      delete this.errorCache[interaction.id]
    })
    register('err', (...args) => this.storeError(...args), undefined, this.ee)
    register('ierr', (...args) => this.storeError(...args), undefined, this.ee)

    var harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'jserrors.harvestTimeSeconds') || 10

    // on('jserrors', this.onHarvestStarted) //harvest.js --> now a class()
    var scheduler = new HarvestScheduler('jserrors', { onFinished: (...args) => this.onHarvestFinished(...args) }, this)
    scheduler.harvest.on('jserrors', (...args) => this.onHarvestStarted(...args))
    scheduler.startTimer(harvestTimeSeconds)
  }

  onHarvestStarted(options) {
    var body = this.aggregator.take(['err', 'ierr'])

    if (options.retry) {
      this.currentBody = body
    }

    var payload = { body: body, qs: {} }
    var releaseIds = stringify(getRuntime(this.agentIdentifier).releaseIds)

    if (releaseIds !== '{}') {
      payload.qs.ri = releaseIds
    }

    if (body && body.err && body.err.length && !this.errorOnPage) {
      payload.qs.pve = '1'
      this.errorOnPage = true
    }
    return payload
  }

  onHarvestFinished(result) {
    if (result.retry && this.currentBody) {
      mapOwn(this.currentBody, function (key, value) {
        for (var i = 0; i < value.length; i++) {
          var bucket = value[i]
          var name = this.getBucketName(bucket.params, bucket.custom)
          this.aggregator.merge(key, name, bucket.metrics, bucket.params, bucket.custom)
        }
      })
      this.currentBody = null
    }
  }

  nameHash(params) {
    return stringHashCode(params.exceptionClass) ^ params.stackHash
  }

  getBucketName(params, customParams) {
    return this.nameHash(params) + ':' + stringHashCode(stringify(customParams))
  }

  canonicalizeURL(url, cleanedOrigin) {
    if (typeof url !== 'string') return ''

    var cleanedURL = cleanURL(url)
    if (cleanedURL === cleanedOrigin) {
      return '<inline>'
    } else {
      return cleanedURL
    }
  }

  buildCanonicalStackString(stackInfo, cleanedOrigin) {
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
  canonicalizeStackURLs(stackInfo) {
    // Currently, loader.origin might contain a fragment, but we don't want to use it
    // for comparing with frame URLs.
    var cleanedOrigin = cleanURL(getRuntime(this.agentIdentifier).origin)

    for (var i = 0; i < stackInfo.frames.length; i++) {
      var frame = stackInfo.frames[i]
      var originalURL = frame.url
      var cleanedURL = this.canonicalizeURL(originalURL, cleanedOrigin)
      if (cleanedURL && cleanedURL !== frame.url) {
        frame.url = cleanedURL
        stackInfo.stackString = stackInfo.stackString.split(originalURL).join(cleanedURL)
      }
    }

    return stackInfo
  }

  storeError(err, time, internal, customAttributes) {
    // are we in an interaction
    time = time || now()
    if (!internal && getRuntime(this.agentIdentifier).onerror && getRuntime(this.agentIdentifier).onerror(err)) return

    var stackInfo = this.canonicalizeStackURLs(computeStackTrace(err))
    var canonicalStack = this.buildCanonicalStackString(stackInfo)

    var params = {
      stackHash: stringHashCode(canonicalStack),
      exceptionClass: stackInfo.name,
      request_uri: window.location.pathname
    }
    if (stackInfo.message) {
      params.message = '' + stackInfo.message
    }

    if (!this.stackReported[params.stackHash]) {
      this.stackReported[params.stackHash] = true
      params.stack_trace = truncateSize(stackInfo.stackString)
    } else {
      params.browser_stack_hash = stringHashCode(stackInfo.stackString)
    }
    params.releaseIds = stringify(getRuntime(this.agentIdentifier).releaseIds)

    // When debugging stack canonicalization/hashing, uncomment these lines for
    // more output in the test logs
    // params.origStack = err.stack
    // params.canonicalStack = canonicalStack

    var hash = this.nameHash(params)

    if (!this.pageviewReported[hash]) {
      params.pageview = 1
      this.pageviewReported[hash] = true
    }

    var type = internal ? 'ierr' : 'err'
    var newMetrics = { time: time }

    // stn and spa aggregators listen to this event - stn sends the error in its payload,
    // and spa annotates the error with interaction info
    handle('errorAgg', [type, hash, params, newMetrics], undefined, undefined, this.ee)

    if (params._interactionId != null) {
      // hold on to the error until the interaction finishes
      this.errorCache[params._interactionId] = this.errorCache[params._interactionId] || []
      this.errorCache[params._interactionId].push([type, hash, params, newMetrics, att, customAttributes])
    } else {
      // store custom attributes
      var customParams = {}
      var att = getInfo(this.agentIdentifier).jsAttributes
      mapOwn(att, setCustom)
      if (customAttributes) {
        mapOwn(customAttributes, setCustom)
      }

      var jsAttributesHash = stringHashCode(stringify(customParams))
      var aggregateHash = hash + ':' + jsAttributesHash
      this.aggregator.store(type, aggregateHash, params, newMetrics, customParams)
    }

    function setCustom(key, val) {
      customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  }
}

