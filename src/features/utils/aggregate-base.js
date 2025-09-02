/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FeatureBase } from './feature-base'
import { isValid } from '../../common/config/info'
import { configure } from '../../loaders/configure/configure'
import { gosCDN } from '../../common/window/nreum'
import { drain } from '../../common/drain/drain'
import { activatedFeatures } from '../../common/util/feature-flags'
import { Obfuscator } from '../../common/util/obfuscate'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { Harvester } from '../../common/harvest/harvester'
import { EventBuffer } from './event-buffer'
import { handle } from '../../common/event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../metrics/constants'
import { EventAggregator } from '../../common/aggregate/event-aggregator'
import { MAX_PAYLOAD_SIZE, IDEAL_PAYLOAD_SIZE } from '../../common/constants/agent-constants'

export class AggregateBase extends FeatureBase {
  supportsRegisteredEntities = false // overridden by feature aggregates if true
  /**
   * Create an AggregateBase instance.
   * @param {Object} agentRef The reference to the agent instance.
   * @param {string} featureName The name of the feature creating the instance.
   */
  constructor (agentRef, featureName) {
    super(agentRef.agentIdentifier, featureName)
    this.agentRef = agentRef
    this.checkConfiguration(agentRef)
    this.doOnceForAllAggregate(agentRef)

    /** @type {Boolean} indicates if custom attributes are combined in each event payload for size estimation purposes. this is set to true in derived classes that need to evaluate custom attributes separately from the event payload */
    this.customAttributesAreSeparate = false
    /** @type {Boolean} indicates if the feature can harvest early. This is set to false in derived classes that need to block early harvests, like ajax under certain conditions */
    this.canHarvestEarly = true // this is set to false in derived classes that need to block early harvests, like ajax under certain conditions

    this.harvestOpts = {} // features aggregate classes can define custom opts for when their harvest is called

    this.#setupEventStore()

    this.waitForDrain()
  }

  /**
   * sets up the event store for the feature.  It must wait for the entity guid to be available before setting up the event store.  This is called once the rum response is received with an entityGuid.
   * @param {string} entityGuid
   * @returns {void}
   */
  #setupEventStore () {
    if (this.events) return
    switch (this.featureName) {
    // SessionReplay has its own storage mechanisms.
      case FEATURE_NAMES.sessionReplay:
        break
        // Jserror and Metric features uses a singleton EventAggregator instead of a regular EventBuffer.
      case FEATURE_NAMES.jserrors:
      case FEATURE_NAMES.metrics:
        this.events = this.agentRef.sharedAggregator ??= new EventAggregator()
        break
        /** All other features get EventBuffer by default. Note: PVE is included here, but event buffer will always be empty so future harvests will still not happen by interval or EOL.
    This was necessary to prevent race cond. issues where the event buffer was checked before the feature could "block" itself.
    Its easier to just keep an empty event buffer in place. */
      default:
        this.events = new EventBuffer(MAX_PAYLOAD_SIZE, this)
        break
    }
  }

  /**
   * the endpoint version the feature uses during harvests
   * @type {number}
   * @returns {boolean}
   */
  get harvestEndpointVersion () {
    return this.supportsRegisteredEntities && !!this.agentRef.runtime.registeredEntities.length ? 2 : 1
  }

  waitForDrain () {
    /** emitted when the feature successfully drains */
    this.ee.on('drain-' + this.featureName, () => {
      /** make an immediate harvest for all the features to help with harvestability for pre-load dervied data on short lived pages */
      if (!this.drained) setTimeout(() => this.agentRef.runtime.harvester.triggerHarvestFor(this), 1)
      this.drained = true
    })
  }

  /**
   * Evaluates whether a harvest should be made early by estimating the size of the current payload.  Currently, this only happens if the event storage is EventBuffer, since that triggers this method directly.
   * If conditions are met, a new harvest will be triggered immediately.
   * @returns void
   */
  decideEarlyHarvest () {
    if (!this.canHarvestEarly) return
    const estimatedSize = this.events.byteSize() + (this.customAttributesAreSeparate ? this.agentRef.runtime.jsAttributesMetadata.bytes : 0)
    if (estimatedSize > IDEAL_PAYLOAD_SIZE) {
      this.agentRef.runtime.harvester.triggerHarvestFor(this)
      this.reportSupportabilityMetric(`${this.featureName}/Harvest/Early/Seen`, estimatedSize)
    }
  }

  /**
   * New handler for waiting for multiple flags. Useful when expecting multiple flags simultaneously (ex. stn vs sr)
   * @param {string[]} flagNames
   * @returns {Promise}
   */
  waitForFlags (flagNames = []) {
    const flagsPromise = new Promise((resolve, reject) => {
      if (activatedFeatures[this.agentIdentifier]) {
        resolve(buildOutput(activatedFeatures[this.agentIdentifier]))
      } else {
        this.ee.on('rumresp', (resp = {}) => {
          resolve(buildOutput(resp))
        })
      }
      function buildOutput (ref) {
        return flagNames.map(flag => {
          if (!ref[flag]) return 0
          return ref[flag]
        })
      }
    })
    return flagsPromise.catch(err => {
      this.ee.emit('internal-error', [err])
      this.blocked = true
      this.deregisterDrain()
    })
  }

  /**
   * Stages the feature to be drained
   */
  drain () {
    drain(this.agentIdentifier, this.featureName)
  }

  preHarvestChecks (opts) {
    return !this.blocked
  }

  /**
   * Return harvest payload. A "serializer" function can be defined on a derived class to format the payload.
   * @param {Boolean} shouldRetryOnFail - harvester flag to backup payload for retry later if harvest request fails; this should be moved to harvester logic
   * @param {object|undefined} opts - opts passed from the harvester to help form the payload
   * @param {string} opts.target - the target app metadata
   * @returns {Array} Final payload tagged with their targeting browser app. The value of `payload` can be undefined if there are no pending events for an app. This should be a minimum length of 1.
   */
  makeHarvestPayload (shouldRetryOnFail = false, opts = {}) {
    if (!this.events || this.events.isEmpty(this.harvestOpts)) return
    // Other conditions and things to do when preparing harvest that is required.
    if (this.preHarvestChecks && !this.preHarvestChecks(opts)) return

    if (shouldRetryOnFail) this.events.save(this.harvestOpts)
    const data = this.events.get(this.harvestOpts)
    if (!data) return
    this.events.clear(this.harvestOpts)

    // A serializer or formatter assists in creating the payload `body` from stored events on harvest when defined by derived feature class.
    const body = this.serializer ? this.serializer(data) : data
    const payload = {
      body
    }
    // Constructs the payload `qs` for relevant features on harvest.
    if (this.queryStringsBuilder) payload.qs = this.queryStringsBuilder(data)
    return payload
  }

  /**
   * Cleanup task after a harvest.
   * @param {object} result - the cbResult object from the harvester's send method
   * @param {boolean=} result.sent - whether the harvest was sent successfully
   * @param {boolean=} result.retry - whether the harvest should be retried
   */
  postHarvestCleanup (result = {}) {
    const harvestFailed = result.sent && result.retry
    if (harvestFailed) this.events.reloadSave(this.harvestOpts)
    this.events.clearSave(this.harvestOpts)
  }

  /**
   * Checks for additional `jsAttributes` items to support backward compatibility with implementations of the agent where
   * loader configurations may appear after the loader code is executed.
   */
  checkConfiguration (existingAgent) {
    // NOTE: This check has to happen at aggregator load time
    if (!isValid(existingAgent.info)) {
      const cdn = gosCDN()
      let jsAttributes = { ...cdn.info?.jsAttributes }
      try {
        jsAttributes = {
          ...jsAttributes,
          ...existingAgent.info?.jsAttributes
        }
      } catch (err) {
        // do nothing
      }
      configure(existingAgent, {
        ...cdn,
        info: {
          ...cdn.info,
          jsAttributes
        },
        runtime: existingAgent.runtime
      }, existingAgent.runtime.loaderType)
    }
  }

  /**
   * These are actions related to shared resources that should be initialized once by whichever feature Aggregate subclass loads first.
   * This method should run after checkConfiguration, which may reset the agent's info/runtime object that is used here.
   */
  doOnceForAllAggregate (agentRef) {
    if (!agentRef.runtime.obfuscator) agentRef.runtime.obfuscator = new Obfuscator(agentRef)
    this.obfuscator = agentRef.runtime.obfuscator

    if (!agentRef.runtime.harvester) agentRef.runtime.harvester = new Harvester(agentRef)
  }

  /**
   * Report a supportability metric
   * @param {*} metricName The tag of the name matching the Angler aggregation tag
   * @param {*} [value] An optional value to supply. If not supplied, the metric count will be incremented by 1 for every call.
   */
  reportSupportabilityMetric (metricName, value) {
    handle(SUPPORTABILITY_METRIC_CHANNEL, [metricName, value], undefined, FEATURE_NAMES.metrics, this.ee)
  }
}
