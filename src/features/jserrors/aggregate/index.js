/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { canonicalFunctionName } from './canonical-function-name'
import { computeStackTrace } from './compute-stack-trace'
import { stringHashCode } from './string-hash-code'
import { truncateSize } from './format-stack-trace'

import { registerHandler as register } from '../../../common/event-emitter/register-handler'
import { stringify } from '../../../common/util/stringify'
import { handle } from '../../../common/event-emitter/handle'
import { globalScope } from '../../../common/constants/runtime'

import { FEATURE_NAME } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { AggregateBase } from '../../utils/aggregate-base'
import { now } from '../../../common/timing/now'
import { applyFnToProps } from '../../../common/util/traverse'
import { evaluateInternalError } from './internal-errors'
import { getVersion2Attributes } from '../../../common/util/v2'
import { buildCauseString } from './cause-string'

/**
 * @typedef {import('./compute-stack-trace.js').StackInfo} StackInfo
 */

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    /** set up agg-level behaviors specific to this feature */
    this.harvestOpts.aggregatorTypes = ['err', 'ierr', 'xhr'] // the types in EventAggregator this feature cares about
    this.stackReported = {}
    this.observedAt = {}
    this.pageviewReported = {}
    this.errorOnPage = false

    register('err', (...args) => this.storeError(...args), this.featureName, this.ee)
    register('ierr', (...args) => this.storeError(...args), this.featureName, this.ee)
    register('returnJserror', (jsErrorEvent, softNavAttrs) => this.#storeJserrorForHarvest(jsErrorEvent, softNavAttrs), this.featureName, this.ee)

    // 0 == off, 1 == on
    this.waitForFlags(['err']).then(([errFlag]) => {
      if (errFlag) {
        this.drain()
      } else {
        this.blocked = true // if rum response determines that customer lacks entitlements for spa endpoint, this feature shouldn't harvest
        this.deregisterDrain()
      }
    })
  }

  serializer (aggregatorTypeToBucketsMap) {
    return applyFnToProps(aggregatorTypeToBucketsMap, this.obfuscator.obfuscateString.bind(this.obfuscator), 'string')
  }

  queryStringsBuilder (aggregatorTakeReturnedData) {
    const qs = {}
    const releaseIds = stringify(this.agentRef.runtime.releaseIds)
    if (releaseIds !== '{}') qs.ri = releaseIds

    if (aggregatorTakeReturnedData?.err?.length) {
      if (!this.errorOnPage) {
        qs.pve = '1'
        this.errorOnPage = true
      }
      // For assurance, erase any `hasReplay` flag from all errors if replay is not recording, not-yet imported, or not running at all.
      if (!this.agentRef.features?.[FEATURE_NAMES.sessionReplay]?.featAggregate?.replayIsActive()) aggregatorTakeReturnedData.err.forEach(error => delete error.params.hasReplay)
    }
    return qs
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

  /**
   *
   * @param {Error|UncaughtError} err The error instance to be processed
   * @param {number} time the relative ms (to origin) timestamp of occurence
   * @param {boolean=} internal if the error was "caught" and deemed "internal" before reporting to the jserrors feature
   * @param {object=} customAttributes  any custom attributes to be included in the error payload
   * @param {boolean=} hasReplay a flag indicating if the error occurred during a replay session
   * @param {string=} swallowReason a string indicating pre-defined reason if swallowing the error.  Mainly used by the internal error SMs.
   * @param {object=} target the target to buffer and harvest to, if undefined the default configuration target is used
   * @returns
   */
  storeError (err, time, internal, customAttributes, hasReplay, swallowReason, target) {
    if (!err) return
    // are we in an interaction
    time = time || now()
    let filterOutput

    if (!internal && this.agentRef.runtime.onerror) {
      filterOutput = this.agentRef.runtime.onerror(err)
      if (filterOutput && !(typeof filterOutput.group === 'string' && filterOutput.group.length)) {
        // All truthy values mean don't report (store) the error, per backwards-compatible usage,
        // - EXCEPT if a fingerprinting label is returned, via an object with key of 'group' and value of non-empty string
        return
      }
      // Again as with previous usage, all falsey values would include the error.
    }

    var stackInfo = computeStackTrace(err)

    const { shouldSwallow, reason } = evaluateInternalError(stackInfo, internal, swallowReason)
    if (shouldSwallow) {
      this.reportSupportabilityMetric('Internal/Error/' + reason)
      return
    }

    var canonicalStackString = this.buildCanonicalStackString(stackInfo)

    const causeStackString = buildCauseString(err)

    const params = {
      stackHash: stringHashCode(canonicalStackString),
      exceptionClass: stackInfo.name,
      request_uri: globalScope?.location.pathname,
      ...(causeStackString && { cause: causeStackString })
    }
    if (stackInfo.message) params.message = '' + stackInfo.message
    // Notice if filterOutput isn't false|undefined OR our specified object, this func would've returned already (so it's unnecessary to req-check group).
    // Do not modify the name ('errorGroup') of params without DEM approval!
    if (filterOutput?.group) params.errorGroup = filterOutput.group

    // Should only decorate "hasReplay" for the container agent, so check if the target matches the config
    if (hasReplay && !target) params.hasReplay = hasReplay
    /**
     * The bucketHash is different from the params.stackHash because the params.stackHash is based on the canonicalized
     * stack trace and is used downstream in NR1 to attempt to group the same errors across different browsers. However,
     * the canonical stack trace excludes items like the column number increasing the hit-rate of different errors potentially
     * bucketing and ultimately resulting in the loss of data in NR1.
     */
    var bucketHash = stringHashCode(`${stackInfo.name}_${stackInfo.message}_${stackInfo.stackString}_${params.hasReplay ? 1 : 0}_${target?.id || 'container'}`)

    if (!this.stackReported[bucketHash]) {
      this.stackReported[bucketHash] = true
      params.stack_trace = truncateSize(stackInfo.stackString)
      this.observedAt[bucketHash] = Math.floor(this.agentRef.runtime.timeKeeper.correctRelativeTimestamp(time))
    } else {
      params.browser_stack_hash = stringHashCode(stackInfo.stackString)
    }
    params.releaseIds = stringify(this.agentRef.runtime.releaseIds)

    // When debugging stack canonicalization/hashing, uncomment these lines for
    // more output in the test logs
    // params.origStack = err.stack
    // params.canonicalStack = canonicalStack

    if (!this.pageviewReported[bucketHash]) {
      params.pageview = 1
      this.pageviewReported[bucketHash] = true
    }

    params.firstOccurrenceTimestamp = this.observedAt[bucketHash]
    params.timestamp = Math.floor(this.agentRef.runtime.timeKeeper.correctRelativeTimestamp(time))

    var type = 'err'
    var newMetrics = { time }

    // Trace sends the error in its payload, and both trace & replay simply listens for any error to occur.
    const jsErrorEvent = [type, bucketHash, params, newMetrics, customAttributes]
    if (!target) handle('trace-jserror', jsErrorEvent, undefined, FEATURE_NAMES.sessionTrace, this.ee)
    // still send EE events for other features such as above, but stop this one from aggregating internal data
    if (this.blocked) return

    if (err.__newrelic?.[this.agentIdentifier]) {
      params._interactionId = err.__newrelic[this.agentIdentifier].interactionId
      params._interactionNodeId = err.__newrelic[this.agentIdentifier].interactionNodeId
    }
    if (err.__newrelic?.socketId) {
      customAttributes.socketId = err.__newrelic.socketId
    }

    if (!target) {
      const softNavInUse = Boolean(this.agentRef.features?.[FEATURE_NAMES.softNav])
      if (softNavInUse) { // pass the error to soft nav for evaluation - it will return it via 'returnJserror' when interaction is resolved
        handle('jserror', [jsErrorEvent], undefined, FEATURE_NAMES.softNav, this.ee)
      } else {
        this.#storeJserrorForHarvest(jsErrorEvent, false)
      }
    }

    // always add directly if scoped to a sub-entity, the other pathways above will be deterministic if the main agent should procede
    if (target) this.#storeJserrorForHarvest([...jsErrorEvent, target], false, params._softNavAttributes)
  }

  #storeJserrorForHarvest (errorInfoArr, softNavCustomAttrs = {}) {
    let [type, bucketHash, params, newMetrics, localAttrs, target] = errorInfoArr
    const allCustomAttrs = {
      /** MFE specific attributes if in "multiple" mode (ie consumer version 2) */
      ...getVersion2Attributes(target, this)
    }

    Object.entries(this.agentRef.info.jsAttributes).forEach(([k, v]) => setCustom(k, v))
    Object.entries(softNavCustomAttrs).forEach(([k, v]) => setCustom(k, v)) // when an ixn finishes, it'll pass attrs specific to the ixn; if no associated ixn, this defaults to empty
    if (params.browserInteractionId) bucketHash += params.browserInteractionId
    if (localAttrs) Object.entries(localAttrs).forEach(([k, v]) => setCustom(k, v)) // local custom attrs are applied in either case with the highest precedence

    const jsAttributesHash = stringHashCode(stringify(allCustomAttrs))
    const aggregateHash = bucketHash + ':' + jsAttributesHash

    this.events.add([type, aggregateHash, params, newMetrics, allCustomAttrs])

    function setCustom (key, val) {
      allCustomAttrs[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  }
}
