/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { FEATURE_TO_ENDPOINT, FEATURE_NAMES } from '../../loaders/features/features'
import { handle } from '../event-emitter/handle'
import { subscribeToEOL } from '../unload/eol'
import { getSubmitMethod, xhr as xhrMethod } from '../util/submit-data'
import { send } from './send'

const RETRY = 'Harvester/Retry/'
const RETRY_ATTEMPTED = RETRY + 'Attempted/'
const RETRY_FAILED = RETRY + 'Failed/'
const RETRY_SUCCEEDED = RETRY + 'Succeeded/'

export class Harvester {
  #started = false
  initializedAggregates = []

  constructor (agentRef) {
    this.agentRef = agentRef

    subscribeToEOL(() => { // do one last harvest round or check
      this.initializedAggregates.forEach(aggregateInst => { // let all features wrap up things needed to do before ANY harvest in case there's last minute cross-feature data dependencies
        if (typeof aggregateInst.harvestOpts.beforeUnload === 'function') aggregateInst.harvestOpts.beforeUnload()
      })
      this.initializedAggregates.forEach(aggregateInst => this.triggerHarvestFor(aggregateInst, { isFinalHarvest: true }))
      /* This callback should run in bubble phase, so that CWV api, like "onLCP", is called before the final harvest so that emitted timings are part of last outgoing. */
    }, false)
  }

  startTimer (harvestInterval = this.agentRef.init.harvest.interval) {
    if (this.#started) return
    this.#started = true

    const onHarvestInterval = () => {
      this.initializedAggregates.forEach(aggregateInst => this.triggerHarvestFor(aggregateInst))
      setTimeout(onHarvestInterval, harvestInterval * 1000) // repeat in X seconds
    }
    setTimeout(onHarvestInterval, harvestInterval * 1000)
  }

  /**
   * Given a feature (aggregate), execute a harvest on-demand.
   * @param {object} aggregateInst
   * @param {object} localOpts
   * @returns {boolean} True if 1+ network call was made. Note that this does not mean or guarantee that it was successful (or that all were in the case of more than 1).
   */
  triggerHarvestFor (aggregateInst, localOpts = {}) {
    const output = { ranSend: false, payload: undefined, endpointVersion: aggregateInst.harvestEndpointVersion || 1 }
    if (aggregateInst.blocked) return output
    if (this.agentRef.init?.browser_consent_mode?.enabled && !this.agentRef.runtime.consented) return output

    const submitMethod = getSubmitMethod(localOpts)
    if (!submitMethod) return output

    const shouldRetryOnFail = !localOpts.isFinalHarvest && submitMethod === xhrMethod // always retry all features harvests except for final
    output.payload = aggregateInst.makeHarvestPayload(shouldRetryOnFail, localOpts)

    if (!output.payload) return output

    send(this.agentRef, {
      endpoint: FEATURE_TO_ENDPOINT[aggregateInst.featureName],
      payload: output.payload,
      localOpts,
      submitMethod,
      cbFinished,
      raw: aggregateInst.harvestOpts.raw,
      featureName: aggregateInst.featureName,
      endpointVersion: output.endpointVersion
    })
    output.ranSend = true // Set to true if we attempted to send (even if send() returned false due to missing errorBeacon in tests)

    return output

    /**
     * This is executed immediately after harvest sends the data via XHR, or if there's nothing to send. Note that this excludes on unloading / sendBeacon.
     * @param {Object} result - information regarding the result of the harvest attempt
     */
    function cbFinished (result) {
      if (aggregateInst.harvestOpts.prevAttemptCode) { // this means we just retried a harvest that last failed
        const reportSM = (message) => handle(SUPPORTABILITY_METRIC_CHANNEL, [message], undefined, FEATURE_NAMES.metrics, aggregateInst.ee)
        reportSM(RETRY_ATTEMPTED + aggregateInst.featureName)
        reportSM((result.retry ? RETRY_FAILED : RETRY_SUCCEEDED) + aggregateInst.harvestOpts.prevAttemptCode)
        delete aggregateInst.harvestOpts.prevAttemptCode // always reset last observation so we don't falsely report again next harvest
        // In case this re-attempt failed again, that'll be handled (re-marked again) next.
      }
      if (result.retry) aggregateInst.harvestOpts.prevAttemptCode = result.status // earmark this Agg harvest as failed-but-retrying for next harvest trigger so we can capture metrics about retries

      if (localOpts.forceNoRetry) result.retry = false // discard unsent data rather than re-queuing for next harvest attempt; used by session reset to flush data belonging to prev session
      aggregateInst.postHarvestCleanup(result)
    }
  }
}
