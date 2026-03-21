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
import { getRegisteredTargetsFromFilename, getVersion2Attributes, getVersion2DuplicationAttributes, shouldDuplicate } from '../../../common/util/v2'
import { buildCauseString } from './cause-string'
import { ShortCircuit } from '../../../common/util/short-circuit'

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

    register('err', this.processError.bind(this), this.featureName, this.ee)
    register('ierr', this.processError.bind(this), this.featureName, this.ee)
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
   * Main entry point for processing JavaScript errors. This method orchestrates the complete error processing pipeline.
   *
   * Processing Flow:
   * 1. Filter the error through the customer's onerror handler (if configured and not internal)
   * 2. Compute the stack trace from the error object
   * 3. Evaluate if the error should be swallowed (internal errors, known issues, etc.)
   * 4. Derive target(s) for the error (MFE detection for v2 endpoints, or default target) - Note: "undefined" indicates the default target will be used
   * 5. Store the error for each derived target. During storage (#storeJserrorForHarvest), duplication for MFE <-> container will be handled
   *
   * Important: "ShortCircuit" Pattern:
   * Several steps in the pipeline can throw a ShortCircuit error to halt processing without
   * treating it as a reportable error. This pattern is used when:
   * - The customer's onerror handler returns a truthy value (excluding fingerprinting objects)
   * - The error is identified as an internal error that shouldn't be reported
   *
   * When a ShortCircuit is thrown, processing stops immediately and the error is not stored.
   * Any other thrown error is re-thrown as it represents an actual problem in the agent code.
   *
   * @param {Error|UncaughtError} err - The error instance to be processed
   * @param {number} [time] - The relative ms (to origin) timestamp of occurrence. Defaults to now()
   * @param {boolean} [internal=false] - If the error was "caught" and deemed "internal" before reporting to the jserrors feature
   * @param {object} [customAttributes] - Any custom attributes to be included in the error payload
   * @param {boolean} [hasReplay=false] - A flag indicating if the error occurred during a replay session
   * @param {string} [swallowReason] - A string indicating pre-defined reason if swallowing the error. Mainly used by internal error supportability metrics
   * @param {object} [target] - The target to buffer and harvest to. If undefined, the default configuration target is used
   * @returns {void}
   */
  processError (err, time, internal, customAttributes, hasReplay, swallowReason, target) {
    if (!err) return
    time = time || now()
    try {
      const filterOutput = this.#filterError(err, internal)
      const stackInfo = computeStackTrace(err)
      this.#swallowError(stackInfo, internal, swallowReason)
      this.#deriveTargets(stackInfo, target).forEach(target => {
        this.#storeError(err, time, stackInfo, filterOutput, customAttributes, hasReplay, target)
      })
    } catch (e) {
      if (!(e instanceof ShortCircuit)) {
        throw e
      }
    }
  }

  /**
   * Filters an error through the customer's configured onerror handler.
   *
   * If the customer has configured a custom onerror handler and the error is not internal,
   * this method invokes that handler. The handler's return value determines whether the error
   * should be reported:
   * - Falsey values (false, null, undefined, etc.) → Report the error normally
   * - Truthy non-object values → Don't report (throws ShortCircuit)
   * - Object with 'group' property (non-empty string) → Report with fingerprinting label
   * - Any other truthy value → Don't report (throws ShortCircuit)
   *
   * @param {Error|UncaughtError} err - The error to filter
   * @param {boolean} internal - Whether this is an internal error (internal errors skip filtering)
   * @returns {undefined|object} The filter output. If an object with 'group' property, contains fingerprinting data
   * @throws {ShortCircuit} When the error should not be reported based on the filter output
   */
  #filterError (err, internal) {
    let filterOutput

    if (!internal && this.agentRef.runtime.onerror) {
      filterOutput = this.agentRef.runtime.onerror(err)
      if (filterOutput && !(typeof filterOutput.group === 'string' && filterOutput.group.length)) {
        // All truthy values mean don't report (store) the error, per backwards-compatible usage,
        // - EXCEPT if a fingerprinting label is returned, via an object with key of 'group' and value of non-empty string
        throw new ShortCircuit()
      }
      // Again as with previous usage, all falsey values would include the error.
    }
    return filterOutput
  }

  /**
   * Evaluates whether an error should be swallowed (not reported) based on internal error criteria.
   *
   * This method uses the evaluateInternalError function to determine if the error matches known
   * internal error patterns (e.g., errors from the agent itself, known browser issues, etc.).
   * If the error should be swallowed, a supportability metric is recorded and processing is halted.
   *
   * @param {StackInfo} stackInfo - The computed stack trace information
   * @param {boolean} internal - Whether the error was marked as internal
   * @param {string} [swallowReason] - Optional pre-determined reason for swallowing
   * @returns {void}
   * @throws {ShortCircuit} When the error should be swallowed and not reported
   */
  #swallowError (stackInfo, internal, swallowReason) {
    const { shouldSwallow, reason } = evaluateInternalError(stackInfo, internal, swallowReason)
    if (shouldSwallow) {
      this.reportSupportabilityMetric('Internal/Error/' + reason)
      throw new ShortCircuit()
    }
  }

  /**
   * Derives the appropriate targets for reporting the given stack information.
   *
   * Targets represent the entities that should receive the error data. This is particularly
   * important for Micro Frontend (MFE) scenarios where errors may need to be reported to
   * different applications.
   *
   * Logic:
   * - If a target is explicitly provided (e.g., from the register API), use it
   * - For v2 endpoints without an explicit target, scan stack frames to detect MFE sources
   * - If no MFE is detected or v2 is not enabled, use undefined (default target)
   *
   * @param {StackInfo} stackInfo - The computed stack trace information containing frames
   * @param {object} [target] - Explicitly provided target, typically from the register API
   * @returns {Array<object|undefined>} Array of targets to report the error to. Always contains at least one element.
   */
  #deriveTargets (stackInfo, target) {
    const targets = []
    if (target) {
      // reported by the register API directly
      targets.push(target)
    } else {
      // we dont know if this is MFE yet, we need to figure it out.
      if (this.harvestEndpointVersion === 2) {
        for (const frame of stackInfo.frames) {
          targets.push(...getRegisteredTargetsFromFilename(frame.url, this.agentRef))
          if (targets.length) break
        }
      }
      if (!targets.length) targets.push(undefined)
    }
    return targets
  }

  /**
   * Stores error data for eventual harvesting and transmission to the backend.
   *
   * This method processes the error through several stages:
   * 1. Build canonical stack string for cross-browser error grouping
   * 2. Build cause chain string if the error has a cause property
   * 3. Create params object with error metadata (stack hash, class, message, etc.)
   * 4. Create bucket hash for internal deduplication
   * 5. Store stack trace on first occurrence of this error
   * 6. Add custom attributes and send to other features (trace, replay)
   * 7. Route through soft nav if enabled, or directly to harvest storage
   * 8. Handle MFE duplication for v2 endpoints if needed
   *
   * @param {Error|UncaughtError} err - The error instance to be processed
   * @param {number} time - The relative ms (to origin) timestamp of occurrence
   * @param {StackInfo} stackInfo - The computed stack trace information
   * @param {object} [filterOutput] - Output from the customer's onerror handler, may contain fingerprinting group
   * @param {object} [customAttributes] - Any custom attributes to be included in the error payload
   * @param {boolean} [hasReplay=false] - A flag indicating if the error occurred during a replay session
   * @param {object} [target] - The target to buffer and harvest to. If undefined, the default configuration target is used
   * @returns {void}
   */
  #storeError (err, time, stackInfo, filterOutput, customAttributes, hasReplay, target) {
    var canonicalStackString = this.#buildCanonicalStackString(stackInfo)

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
    var bucketHash = stringHashCode(`${stackInfo.name}_${stackInfo.message}_${stackInfo.stackString}_${params.hasReplay ? 1 : 0}_${target?.id || 'container'}_${target?.instance || ''}`)

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

    if (err.__newrelic?.socketId) {
      customAttributes.socketId = err.__newrelic.socketId
    }

    if (!target) {
      const softNavInUse = Boolean(this.agentRef.features?.[FEATURE_NAMES.softNav])
      if (softNavInUse) { // pass the error to soft nav for evaluation - it will return it via 'returnJserror' when interaction is resolved
        handle('jserror', [jsErrorEvent], undefined, FEATURE_NAMES.softNav, this.ee)
      } else {
        this.#storeJserrorForHarvest(jsErrorEvent)
      }
    }

    // always add directly if scoped to a sub-entity, the other pathways above will be deterministic if the main agent should procede
    if (target) this.#storeJserrorForHarvest(jsErrorEvent, {}, target)
  }

  /**
   * Builds a standardized (canonical) stack trace string from the frames in the given `stackInfo` object.
   *
   * The canonical format is used for cross-browser error grouping in NR1, as different browsers
   * format stack traces differently. Each frame is separated by a newline character and takes
   * the form: `<functionName>@<url>:<lineNumber>`
   *
   * Note: Column numbers are intentionally excluded from the canonical format to improve
   * grouping accuracy, as the same error across different minified builds might have different
   * column numbers but should still be grouped together.
   *
   * Example output:
   * ```
   * handleClick@https://example.com/app.js:42
   * EventEmitter.emit@https://example.com/vendor.js:1337
   * ```
   *
   * @param {StackInfo} stackInfo - An object containing parsed stack frames from computeStackTrace
   * @returns {string} A canonical stack string built from the URLs and function names in the given `stackInfo` object
   */
  #buildCanonicalStackString (stackInfo) {
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
   * Adds a processed error to the harvest buffer with all custom attributes merged.
   *
   * This is the final step before an error is stored to be sent to the backend. It handles:
   * - Merging all custom attributes (global, soft nav, MFE, and local)
   * - Creating a unique aggregate hash for deduplication
   * - Adding the error to the events buffer for harvest
   * - Duplicating the error for MFE scenarios when needed (v2 endpoints)
   *
   * Custom Attribute Precedence (lowest to highest):
   * 1. Global jsAttributes from agent config
   * 2. Soft navigation attributes (if from a soft nav interaction)
   * 3. MFE v2 attributes (source/parent metadata)
   * 4. Local custom attributes passed with the specific error
   *
   * @param {Array} errorInfoArr - Array containing [type, bucketHash, params, metrics, customAttributes, target]
   * @param {object} [attrs={}] - Additional attributes to merge (e.g., from soft nav interactions)
   * @returns {void}
   */
  #storeJserrorForHarvest (errorInfoArr, attrs = {}, target) {
    let [type, bucketHash, params, newMetrics, localAttrs] = errorInfoArr
    const allCustomAttrs = {
      /** MFE specific attributes if in "multiple" mode (ie consumer version 2) */
      ...getVersion2Attributes(target, this)
    }

    Object.entries(this.agentRef.info.jsAttributes).forEach(([k, v]) => setCustom(k, v))
    Object.entries(attrs).forEach(([k, v]) => setCustom(k, v)) // when an ixn finishes, it'll pass attrs specific to the ixn; if no associated ixn, this defaults to empty
    if (params.browserInteractionId) bucketHash += params.browserInteractionId
    if (localAttrs) Object.entries(localAttrs).forEach(([k, v]) => setCustom(k, v)) // local custom attrs are applied in either case with the highest precedence

    const jsAttributesHash = stringHashCode(stringify(allCustomAttrs))
    const aggregateHash = bucketHash + ':' + jsAttributesHash

    this.events.add([type, aggregateHash, params, newMetrics, allCustomAttrs])

    if (shouldDuplicate(target, this.agentRef)) this.#storeJserrorForHarvest(errorInfoArr, getVersion2DuplicationAttributes(target, this))

    function setCustom (key, val) {
      allCustomAttrs[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  }
}
