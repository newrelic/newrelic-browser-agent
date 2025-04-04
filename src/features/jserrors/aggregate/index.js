/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
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
import { isContainerAgentTarget } from '../../../common/util/target'
import { warn } from '../../../common/util/console'

/**
 * @typedef {import('./compute-stack-trace.js').StackInfo} StackInfo
 */

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    this.stackReported = {}
    this.observedAt = {}
    this.pageviewReported = {}
    this.bufferedErrorsUnderSpa = {}
    this.errorOnPage = false

    // this will need to change to match whatever ee we use in the instrument
    this.ee.on('interactionDone', (interaction, wasSaved) => this.onInteractionDone(interaction, wasSaved))

    register('err', (...args) => this.storeError(...args), this.featureName, this.ee)
    register('ierr', (...args) => this.storeError(...args), this.featureName, this.ee)
    register('softNavFlush', (interactionId, wasFinished, softNavAttrs) =>
      this.onSoftNavNotification(interactionId, wasFinished, softNavAttrs), this.featureName, this.ee) // when an ixn is done or cancelled

    this.harvestOpts.aggregatorTypes = ['err', 'ierr', 'xhr'] // the types in EventAggregator this feature cares about

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
  storeError (err, time, internal, customAttributes, hasReplay, swallowReason, targetEntityGuid) {
    if (!err) return
    const target = this.agentRef.runtime.entityManager.get(targetEntityGuid)
    if (!target) return warn(56, this.featureName)
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

    const params = {
      stackHash: stringHashCode(canonicalStackString),
      exceptionClass: stackInfo.name,
      request_uri: globalScope?.location.pathname
    }
    if (stackInfo.message) params.message = '' + stackInfo.message
    // Notice if filterOutput isn't false|undefined OR our specified object, this func would've returned already (so it's unnecessary to req-check group).
    // Do not modify the name ('errorGroup') of params without DEM approval!
    if (filterOutput?.group) params.errorGroup = filterOutput.group

    // Should only decorate "hasReplay" for the container agent, so check if the target matches the config
    if (hasReplay && isContainerAgentTarget(target, this.agentRef)) params.hasReplay = hasReplay
    /**
     * The bucketHash is different from the params.stackHash because the params.stackHash is based on the canonicalized
     * stack trace and is used downstream in NR1 to attempt to group the same errors across different browsers. However,
     * the canonical stack trace excludes items like the column number increasing the hit-rate of different errors potentially
     * bucketing and ultimately resulting in the loss of data in NR1.
     */
    var bucketHash = stringHashCode(`${stackInfo.name}_${stackInfo.message}_${stackInfo.stackString}_${params.hasReplay ? 1 : 0}`)

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
    if (this.shouldAllowMainAgentToCapture(targetEntityGuid)) handle('trace-jserror', jsErrorEvent, undefined, FEATURE_NAMES.sessionTrace, this.ee)
    // still send EE events for other features such as above, but stop this one from aggregating internal data
    if (this.blocked) return

    if (err?.__newrelic?.[this.agentIdentifier]) {
      params._interactionId = err.__newrelic[this.agentIdentifier].interactionId
      params._interactionNodeId = err.__newrelic[this.agentIdentifier].interactionNodeId
    }

    if (this.shouldAllowMainAgentToCapture(targetEntityGuid)) {
      const softNavInUse = Boolean(this.agentRef.features?.[FEATURE_NAMES.softNav])
      // Note: the following are subject to potential race cond wherein if the other feature aren't fully initialized, it'll be treated as there being no associated interaction.
      // They each will also tack on their respective properties to the params object as part of the decision flow.
      if (softNavInUse) handle('jserror', [params, time], undefined, FEATURE_NAMES.softNav, this.ee)
      else handle('spa-jserror', jsErrorEvent, undefined, FEATURE_NAMES.spa, this.ee)

      if (params.browserInteractionId && !params._softNavFinished) { // hold onto the error until the in-progress interaction is done, eithered saved or discarded
        this.bufferedErrorsUnderSpa[params.browserInteractionId] ??= []
        this.bufferedErrorsUnderSpa[params.browserInteractionId].push(jsErrorEvent)
      } else if (params._interactionId != null) { // same as above, except tailored for the way old spa does it
        this.bufferedErrorsUnderSpa[params._interactionId] = this.bufferedErrorsUnderSpa[params._interactionId] || []
        this.bufferedErrorsUnderSpa[params._interactionId].push(jsErrorEvent)
      } else {
      // Either there is no interaction (then all these params properties will be undefined) OR there's a related soft navigation that's already completed.
      // The old spa does not look up completed interactions at all, so there's no need to consider it.
        this.#storeJserrorForHarvest(jsErrorEvent, params.browserInteractionId !== undefined, params._softNavAttributes)
      }
    }

    // always add directly if scoped to a sub-entity, the other pathways above will be deterministic if the main agent should procede
    if (targetEntityGuid) this.#storeJserrorForHarvest([...jsErrorEvent, targetEntityGuid], params.browserInteractionId !== undefined, params._softNavAttributes)
  }

  #storeJserrorForHarvest (errorInfoArr, softNavOccurredFinished, softNavCustomAttrs = {}) {
    let [type, bucketHash, params, newMetrics, localAttrs, targetEntityGuid] = errorInfoArr
    const allCustomAttrs = {}

    if (softNavOccurredFinished) {
      Object.entries(softNavCustomAttrs).forEach(([k, v]) => setCustom(k, v)) // when an ixn finishes, it'll include stuff in jsAttributes + attrs specific to the ixn
      bucketHash += params.browserInteractionId

      delete params._softNavAttributes // cleanup temp properties from synchronous evaluation; this is harmless when async from soft nav (properties DNE)
      delete params._softNavFinished
    } else { // interaction was cancelled -> error should not be associated OR there was no interaction
      Object.entries(this.agentRef.info.jsAttributes).forEach(([k, v]) => setCustom(k, v))
      delete params.browserInteractionId
    }
    if (localAttrs) Object.entries(localAttrs).forEach(([k, v]) => setCustom(k, v)) // local custom attrs are applied in either case with the highest precedence

    const jsAttributesHash = stringHashCode(stringify(allCustomAttrs))
    const aggregateHash = bucketHash + ':' + jsAttributesHash

    this.events.add([type, aggregateHash, params, newMetrics, allCustomAttrs], targetEntityGuid)

    function setCustom (key, val) {
      allCustomAttrs[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  }

  /**
  * If the event lacks an entityGuid (the default behavior), the main agent should capture the data. If the data is assigned to a sub-entity target
  * the main agent should not capture events unless it is configured to do so.
  * @param {string} entityGuid - the context object for the event
  * @returns {boolean} - whether the main agent should capture the event to its internal target
  */
  shouldAllowMainAgentToCapture (entityGuid) {
    return (!entityGuid || this.agentRef.init.api.duplicate_registered_data)
  }

  // TO-DO: Remove this function when old spa is taken out. #storeJserrorForHarvest handles the work with the softnav feature.
  onInteractionDone (interaction, wasSaved) {
    if (!this.bufferedErrorsUnderSpa[interaction.id] || this.blocked) return

    this.bufferedErrorsUnderSpa[interaction.id].forEach((item) => {
      var allCustomAttrs = {}
      const localCustomAttrs = item[4]

      Object.entries(interaction.root.attrs.custom || {}).forEach(setCustom) // tack on custom attrs from the interaction
      Object.entries(localCustomAttrs || {}).forEach(setCustom)

      var params = item[2]
      if (wasSaved) {
        params.browserInteractionId = interaction.root.attrs.id
        if (params._interactionNodeId) params.parentNodeId = params._interactionNodeId.toString()
      }
      delete params._interactionId
      delete params._interactionNodeId

      var hash = wasSaved ? item[1] + interaction.root.attrs.id : item[1]
      var jsAttributesHash = stringHashCode(stringify(allCustomAttrs))
      var aggregateHash = hash + ':' + jsAttributesHash

      this.events.add([item[0], aggregateHash, params, item[3], allCustomAttrs], item[5])

      function setCustom ([key, val]) {
        allCustomAttrs[key] = (val && typeof val === 'object' ? stringify(val) : val)
      }
    })
    delete this.bufferedErrorsUnderSpa[interaction.id]
  }

  onSoftNavNotification (interactionId, wasFinished, softNavAttrs) {
    if (this.blocked) return

    this.bufferedErrorsUnderSpa[interactionId]?.forEach(jsErrorEvent =>
      this.#storeJserrorForHarvest(jsErrorEvent, wasFinished, softNavAttrs) // this should not modify the re-used softNavAttrs contents
    )
    delete this.bufferedErrorsUnderSpa[interactionId] // wipe the list of jserrors so they aren't duplicated by another call to the same id
  }
}
