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
import { globalScope } from '../../../common/util/global-scope'

import { FEATURE_NAME } from '../constants'
import { drain } from '../../../common/drain/drain'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { AggregateBase } from '../../utils/aggregate-base'

/**
 * @typedef {import('./compute-stack-trace.js').StackInfo} StackInfo
 */

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.stackReported = {}
    this.pageviewReported = {}
    this.errorCache = {}
    this.currentBody
    this.errorOnPage = false

    // this will need to change to match whatever ee we use in the instrument
    this.ee.on('interactionSaved', (interaction) => this.onInteractionSaved(interaction))

    // this will need to change to match whatever ee we use in the instrument
    this.ee.on('interactionDiscarded', (interaction) => this.onInteractionDiscarded(interaction))

    register('err', (...args) => this.storeError(...args), this.featureName, this.ee)
    register('ierr', (...args) => this.storeError(...args), this.featureName, this.ee)

    const harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'jserrors.harvestTimeSeconds') || 10

    const scheduler = new HarvestScheduler('jserrors', { onFinished: (...args) => this.onHarvestFinished(...args) }, this)
    scheduler.harvest.on('jserrors', (...args) => this.onHarvestStarted(...args))

    // Don't start harvesting until "drain" for this feat has been called (which currently requires RUM response).
    this.ee.on(`drain-${this.featureName}`, () => {
      if (!this.blocked) scheduler.startTimer(harvestTimeSeconds) // and only if ingest will accept jserror payloads
    })

    // If RUM-call's response determines that customer lacks entitlements for the /jserror ingest endpoint, don't harvest at all.
    register('block-err', () => {
      this.blocked = true
      scheduler.stopTimer(true)
    }, this.featureName, this.ee)

    drain(this.agentIdentifier, this.featureName)
  }

  onHarvestStarted (options) {
    // this gets rid of dependency in AJAX module
    var body = this.aggregator.take(['err', 'ierr', 'xhr'])

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

  onHarvestFinished (result) {
    if (result.retry && this.currentBody) {
      mapOwn(this.currentBody, (key, value) => {
        for (var i = 0; i < value.length; i++) {
          var bucket = value[i]
          var name = this.getBucketName(bucket.params, bucket.custom)
          this.aggregator.merge(key, name, bucket.metrics, bucket.params, bucket.custom)
        }
      })
      this.currentBody = null
    }
  }

  nameHash (params) {
    return stringHashCode(`${params.exceptionClass}_${params.message}_${params.stack_trace || params.browser_stack_hash}`)
  }

  getBucketName (params, customParams) {
    return this.nameHash(params) + ':' + stringHashCode(stringify(customParams))
  }

  /**
   * Builds a standardized stack trace string from the frames in the given `stackInfo` object, with each frame separated
   * by a newline character. Lines take the form `<functionName>@<url>:<lineNumber>`.
   *
   * @param {StackInfo} stackInfo - An object specifying a stack string and individual frames.
   * @returns {string} A canonical stack string built from the URLs and function names in the given `stackInfo` object.
   */
  buildCanonicalStackString (stackInfo) {
    var canonicalStackString = ''

    for (var i = 0; i < stackInfo.frames.length; i++) {
      var frame = stackInfo.frames[i]
      var func = canonicalFunctionName(frame.func)

      if (canonicalStackString) canonicalStackString += '\n'
      if (func) canonicalStackString += func + '@'
      if (typeof frame.url === 'string') canonicalStackString += frame.url
      if (frame.line) canonicalStackString += ':' + frame.line
    }

    return canonicalStackString
  }

  storeError (err, time, internal, customAttributes) {
    // are we in an interaction
    time = time || now()
    const agentRuntime = getRuntime(this.agentIdentifier)
    let filterOutput

    if (!internal && agentRuntime.onerror) {
      filterOutput = agentRuntime.onerror(err)
      if (filterOutput && !(typeof filterOutput.group === 'string' && filterOutput.group.length)) {
        // All truthy values mean don't report (store) the error, per backwards-compatible usage,
        // - EXCEPT if a fingerprinting label is returned, via an object with key of 'group' and value of non-empty string
        return
      }
      // Again as with previous usage, all falsey values would include the error.
    }

    var stackInfo = computeStackTrace(err)
    var canonicalStackString = this.buildCanonicalStackString(stackInfo)

    const params = {
      stackHash: stringHashCode(canonicalStackString),
      exceptionClass: stackInfo.name,
      request_uri: globalScope?.location.pathname
    }
    if (stackInfo.message) params.message = '' + stackInfo.message
    // Notice if filterOutput isn't false|undefined OR our specified object, this func would've returned already (so it's unnecessary to req-check group).
    // Do not modify the name ('errorGroup') of params without DEM approval!
    if (filterOutput?.group) params.errorGroup = filterOutput.group

    /**
     * The bucketHash is different from the params.stackHash because the params.stackHash is based on the canonicalized
     * stack trace and is used downstream in NR1 to attempt to group the same errors across different browsers. However,
     * the canonical stack trace excludes items like the column number increasing the hit-rate of different errors potentially
     * bucketing and ultimately resulting in the loss of data in NR1.
     */
    var bucketHash = stringHashCode(`${stackInfo.name}_${stackInfo.message}_${stackInfo.stackString}`)

    if (!this.stackReported[bucketHash]) {
      this.stackReported[bucketHash] = true
      params.stack_trace = truncateSize(stackInfo.stackString)
    } else {
      params.browser_stack_hash = stringHashCode(stackInfo.stackString)
    }
    params.releaseIds = stringify(agentRuntime.releaseIds)

    // When debugging stack canonicalization/hashing, uncomment these lines for
    // more output in the test logs
    // params.origStack = err.stack
    // params.canonicalStack = canonicalStack

    if (!this.pageviewReported[bucketHash]) {
      params.pageview = 1
      this.pageviewReported[bucketHash] = true
    }

    var type = internal ? 'ierr' : 'err'
    var newMetrics = { time: time }

    // sr, stn and spa aggregators listen to this event - stn sends the error in its payload,
    // and spa annotates the error with interaction info
    const msg = [type, bucketHash, params, newMetrics]
    handle('errorAgg', msg, undefined, FEATURE_NAMES.sessionTrace, this.ee)
    handle('errorAgg', msg, undefined, FEATURE_NAMES.spa, this.ee)
    handle('errorAgg', msg, undefined, FEATURE_NAMES.sessionReplay, this.ee)

    // still send EE events for other features such as above, but stop this one from aggregating internal data
    if (this.blocked) return
    var att = getInfo(this.agentIdentifier).jsAttributes
    if (params._interactionId != null) {
      // hold on to the error until the interaction finishes
      this.errorCache[params._interactionId] = this.errorCache[params._interactionId] || []
      this.errorCache[params._interactionId].push([type, bucketHash, params, newMetrics, att, customAttributes])
    } else {
      // store custom attributes
      var customParams = {}
      mapOwn(att, setCustom)
      if (customAttributes) {
        mapOwn(customAttributes, setCustom)
      }

      var jsAttributesHash = stringHashCode(stringify(customParams))
      var aggregateHash = bucketHash + ':' + jsAttributesHash
      this.aggregator.store(type, aggregateHash, params, newMetrics, customParams)
    }

    function setCustom (key, val) {
      customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  }

  onInteractionSaved (interaction) {
    if (!this.errorCache[interaction.id] || this.blocked) return

    this.errorCache[interaction.id].forEach((item) => {
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

      function setCustom (key, val) {
        customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
      }
    })
    delete this.errorCache[interaction.id]
  }

  onInteractionDiscarded (interaction) {
    if (!this.errorCache || !this.errorCache[interaction.id] || this.blocked) return

    this.errorCache[interaction.id].forEach((item) => {
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

      function setCustom (key, val) {
        customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
      }
    })
    delete this.errorCache[interaction.id]
  }
}
