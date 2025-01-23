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
import { EventStoreManager } from './event-store-manager'
import { Harvester } from '../../common/harvest/harvester'

export class AggregateBase extends FeatureBase {
  constructor (agentRef, featureName) {
    super(agentRef.agentIdentifier, featureName)
    this.agentRef = agentRef
    this.checkConfiguration(agentRef)
    this.doOnceForAllAggregate(agentRef)

    // This switch needs to be after doOnceForAllAggregate which may new sharedAggregator and reset mainAppKey.
    switch (this.featureName) {
      // SessionTrace + Replay have their own storage mechanisms.
      case FEATURE_NAMES.sessionTrace:
      case FEATURE_NAMES.sessionReplay:
        break
      // Jserror and Metric features uses a singleton EventAggregator instead of a regular EventBuffer.
      case FEATURE_NAMES.jserrors:
      case FEATURE_NAMES.metrics:
        this.events = agentRef.sharedAggregator
        break
      /** All other features get EventBuffer in the ESM by default. Note: PVE is included here, but event buffer will always be empty so future harvests will still not happen by interval or EOL.
      This was necessary to prevent race cond. issues where the event buffer was checked before the feature could "block" itself.
      Its easier to just keep an empty event buffer in place. */
      default:
        this.events = new EventStoreManager(agentRef.mainAppKey, 1)
        break
    }
    this.harvestOpts = {} // features aggregate classes can define custom opts for when their harvest is called
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

  drain () {
    drain(this.agentIdentifier, this.featureName)
    this.drained = true
  }

  /**
   * Return harvest payload. A "serializer" function can be defined on a derived class to format the payload.
   * @param {Boolean} shouldRetryOnFail - harvester flag to backup payload for retry later if harvest request fails; this should be moved to harvester logic
   * @param {object|undefined} opts.target - the target app passed onto the event store manager to determine which app's data to return; if none provided, all apps data will be returned
   * @returns {Array} Final payload tagged with their targeting browser app. The value of `payload` can be undefined if there are no pending events for an app. This should be a minimum length of 1.
   */
  makeHarvestPayload (shouldRetryOnFail = false, opts = {}) {
    if (this.events.isEmpty(this.harvestOpts, opts.target)) return
    // Other conditions and things to do when preparing harvest that is required.
    if (this.preHarvestChecks && !this.preHarvestChecks(opts)) return

    if (shouldRetryOnFail) this.events.save(this.harvestOpts, opts.target)
    const returnedDataArr = this.events.get(this.harvestOpts, opts.target)
    if (!returnedDataArr.length) throw new Error('Unexpected problem encountered. There should be at least one app for harvest!')
    this.events.clear(this.harvestOpts, opts.target)

    return returnedDataArr.map(({ targetApp, data }) => {
      // A serializer or formatter assists in creating the payload `body` from stored events on harvest when defined by derived feature class.
      const body = this.serializer ? this.serializer(data) : data
      const payload = {
        body
      }
      // Constructs the payload `qs` for relevant features on harvest.
      if (this.queryStringsBuilder) payload.qs = this.queryStringsBuilder(data)

      return { targetApp, payload }
    })
  }

  /**
   * Cleanup task after a harvest.
   * @param {object} result - the cbResult object from the harvester's send method
   */
  postHarvestCleanup (result = {}) {
    const harvestFailed = result.sent && result.retry
    if (harvestFailed) this.events.reloadSave(this.harvestOpts, result.targetApp)
    this.events.clearSave(this.harvestOpts, result.targetApp)
  }

  /**
   * Checks for additional `jsAttributes` items to support backward compatibility with implementations of the agent where
   * loader configurations may appear after the loader code is executed.
   */
  checkConfiguration (existingAgent) {
    // NOTE: This check has to happen at aggregator load time
    if (!isValid(this.agentIdentifier)) {
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
      configure({ agentIdentifier: this.agentIdentifier }, {
        ...cdn,
        info: {
          ...cdn.info,
          jsAttributes
        },
        runtime: existingAgent.runtime
      })
    }
  }

  /**
   * These are actions related to shared resources that should be initialized once by whichever feature Aggregate subclass loads first.
   * This method should run after checkConfiguration, which may reset the agent's info/runtime object that is used here.
   */
  doOnceForAllAggregate (agentRef) {
    if (!agentRef.runtime.obfuscator) agentRef.runtime.obfuscator = new Obfuscator(agentRef)
    this.obfuscator = agentRef.runtime.obfuscator

    if (!agentRef.mainAppKey) agentRef.mainAppKey = { licenseKey: agentRef.info.licenseKey, appId: agentRef.info.applicationID }
    // Create a single Aggregator for this agent if DNE yet; to be used by jserror endpoint features.
    if (!agentRef.sharedAggregator) agentRef.sharedAggregator = new EventStoreManager(agentRef.mainAppKey, 2)

    if (!agentRef.runtime.harvester) agentRef.runtime.harvester = new Harvester(agentRef)
  }
}
