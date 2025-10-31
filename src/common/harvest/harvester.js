/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { FEATURE_TO_ENDPOINT, JSERRORS, RUM, EVENTS, FEATURE_NAMES, BLOBS, LOGS } from '../../loaders/features/features'
import { VERSION } from '../constants/env'
import { globalScope, isWorkerScope } from '../constants/runtime'
import { handle } from '../event-emitter/handle'
import { eventListenerOpts } from '../event-listener/event-listener-opts'
import { now } from '../timing/now'
import { subscribeToEOL } from '../unload/eol'
import { cleanURL } from '../url/clean-url'
import { obj, param } from '../url/encode'
import { warn } from '../util/console'
import { stringify } from '../util/stringify'
import { getSubmitMethod, xhr as xhrMethod, xhrFetch as fetchMethod } from '../util/submit-data'
import { activatedFeatures } from '../util/feature-flags'
import { dispatchGlobalEvent } from '../dispatch/global-event'

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
      /* This callback should run in bubble phase, so that that CWV api, like "onLCP", is called before the final harvest so that emitted timings are part of last outgoing. */
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
    output.ranSend = true

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

/**
 * @typedef {import('./types.js').NetworkSendSpec} NetworkSendSpec
 */

const warnings = {}
/**
  * Initiate a harvest call.
  * @param {NetworkSendSpec} param0 Specification for sending data
  * @returns {boolean} True if a network call was made. Note that this does not mean or guarantee that it was successful.
  */
export function send (agentRef, { endpoint, payload, localOpts = {}, submitMethod, cbFinished, raw, featureName, endpointVersion = 1 }) {
  if (!agentRef.info.errorBeacon) return false

  let { body, qs } = cleanPayload(payload)

  if (Object.keys(body).length === 0 && !localOpts.sendEmptyBody) { // if there's no body to send, just run onfinish stuff and return
    if (cbFinished) cbFinished({ sent: false })
    return false
  }

  const protocol = agentRef.init.ssl === false ? 'http' : 'https'
  const perceivedBeacon = agentRef.init.proxy.beacon || agentRef.info.errorBeacon
  const url = raw
    ? `${protocol}://${perceivedBeacon}/${endpoint}`
    : `${protocol}://${perceivedBeacon}${endpoint !== RUM ? '/' + endpoint : ''}/${endpointVersion}/${agentRef.info.licenseKey}`
  const baseParams = !raw ? baseQueryString(agentRef, qs, endpoint) : ''
  let payloadParams = obj(qs, agentRef.runtime.maxBytes)
  if (baseParams === '' && payloadParams.startsWith('&')) {
    payloadParams = payloadParams.substring(1)
  }

  const fullUrl = `${url}?${baseParams}${payloadParams}`
  const gzip = !!qs?.attributes?.includes('gzip')

  // all gzipped data is already in the correct format and needs no transformation
  // all features going to 'events' endpoint should already be serialized & stringified
  let stringBody = gzip || endpoint === EVENTS ? body : stringify(body)

  // If body is null, undefined, or an empty object or array after stringifying, send an empty string instead.
  if (!stringBody || stringBody.length === 0 || stringBody === '{}' || stringBody === '[]') stringBody = ''

  // Warn--once per endpoint--if the agent tries to send large payloads
  if (endpoint !== BLOBS && stringBody.length > 750000 && (warnings[endpoint] = (warnings[endpoint] || 0) + 1) === 1) warn(28, endpoint)

  const headers = [{ key: 'content-type', value: 'text/plain' }]

  /* Since workers don't support sendBeacon right now, they can only use XHR method.
      Because they still do permit synch XHR, the idea is that at final harvest time (worker is closing),
      we just make a BLOCKING request--trivial impact--with the remaining data as a temp fill-in for sendBeacon.
     Following the removal of img-element method. */
  let result = submitMethod({ url: fullUrl, body: stringBody, sync: localOpts.isFinalHarvest && isWorkerScope, headers })

  if (!localOpts.isFinalHarvest && cbFinished) { // final harvests don't hold onto buffer data (shouldRetryOnFail is false), so cleanup isn't needed
    if (submitMethod === xhrMethod) {
      result.addEventListener('loadend', function () {
        // `this` here in block refers to the XHR object in this scope, do not change the anon function to an arrow function
        // status 0 refers to a local error, such as CORS or network failure, or a blocked request by the browser (e.g. adblocker)
        const cbResult = { sent: this.status !== 0, status: this.status, retry: shouldRetry(this.status), fullUrl, xhr: this }
        if (localOpts.needResponse) cbResult.responseText = this.responseText
        cbFinished(cbResult)

        /** temporary audit of consistency of harvest metadata flags */
        if (!shouldRetry(this.status)) trackHarvestMetadata()
      }, eventListenerOpts(false))
    } else if (submitMethod === fetchMethod) {
      result.then(async function (response) {
        const status = response.status
        const cbResult = { sent: true, status, retry: shouldRetry(status), fullUrl, fetchResponse: response }
        if (localOpts.needResponse) cbResult.responseText = await response.text()
        cbFinished(cbResult)
        /** temporary audit of consistency of harvest metadata flags */
        if (!shouldRetry(status)) trackHarvestMetadata()
      })
    }

    function trackHarvestMetadata () {
      try {
        if (featureName === FEATURE_NAMES.jserrors && !body?.err) return

        const hasReplay = baseParams.includes('hr=1')
        const hasTrace = baseParams.includes('ht=1')
        const hasError = qs?.attributes?.includes('hasError=true')

        handle('harvest-metadata', [{
          [featureName]: {
            ...(hasReplay && { hasReplay }),
            ...(hasTrace && { hasTrace }),
            ...(hasError && { hasError })
          }
        }], undefined, FEATURE_NAMES.metrics, agentRef.ee)
      } catch (err) {
      // do nothing
      }
    }
  }

  dispatchGlobalEvent({
    agentIdentifier: agentRef.agentIdentifier,
    drained: !!activatedFeatures?.[agentRef.agentIdentifier],
    type: 'data',
    name: 'harvest',
    feature: featureName,
    data: {
      endpoint,
      headers,
      payload,
      submitMethod: getSubmitMethodName(),
      raw,
      synchronousXhr: !!(localOpts.isFinalHarvest && isWorkerScope)
    }
  })

  return true

  function shouldRetry (status) {
    switch (status) {
      case 408:
      case 429:
      case 500:
        return true
    }
    return (status >= 502 && status <= 504) || (status >= 512 && status <= 530)
  }

  function getSubmitMethodName () {
    if (submitMethod === xhrMethod) return 'xhr'
    if (submitMethod === fetchMethod) return 'fetch'
    return 'beacon'
  }
}

/**
 * Cleans and returns a payload object containing a body and qs
 * object with key/value pairs. KV pairs where the value is null,
 * undefined, or an empty string are removed to save on transmission
 * size.
 * @param {HarvestPayload} payload Payload to be sent to the endpoint.
 * @returns {HarvestPayload} Cleaned payload payload to be sent to the endpoint.
 */
function cleanPayload (payload = {}) {
  const clean = (input) => {
    if ((typeof Uint8Array !== 'undefined' && input instanceof Uint8Array) || Array.isArray(input)) return input
    if (typeof input === 'string') return input
    return Object.entries(input || {}).reduce((accumulator, [key, value]) => {
      if ((typeof value === 'number') ||
          (typeof value === 'string' && value.length > 0) ||
          (typeof value === 'object' && Object.keys(value || {}).length > 0)
      ) {
        accumulator[key] = value
      }
      return accumulator
    }, {})
  }

  return {
    body: clean(payload.body),
    qs: clean(payload.qs)
  }
}

// The stuff that gets sent every time.
function baseQueryString (agentRef, qs, endpoint) {
  const ref = agentRef.runtime.obfuscator.obfuscateString(cleanURL('' + globalScope.location))
  const session = agentRef.runtime.session
  const hr = !!session?.state.sessionReplaySentFirstChunk && session?.state.sessionReplayMode === 1 && endpoint !== JSERRORS
  const ht = !!session?.state.traceHarvestStarted && session?.state.sessionTraceMode === 1 && ![LOGS, BLOBS].includes(endpoint)

  const qps = [
    'a=' + agentRef.info.applicationID,
    param('sa', (agentRef.info.sa ? '' + agentRef.info.sa : '')),
    param('v', VERSION),
    transactionNameParam(),
    param('ct', agentRef.runtime.customTransaction),
    param('rst', now(), qs),
    '&ck=0', // ck param DEPRECATED - still expected by backend
    '&s=' + (session?.state.value || '0'), // the 0 id encaps all untrackable and default traffic
    param('ref', ref),
    param('ptid', (agentRef.runtime.ptid ? '' + agentRef.runtime.ptid : ''))
  ]
  if (hr) qps.push(param('hr', '1', qs))
  if (ht) qps.push(param('ht', '1', qs))

  return qps.join('')

  // Constructs the transaction name param for the beacon URL.
  // Prefers the obfuscated transaction name over the plain text.
  // Falls back to making up a name.
  function transactionNameParam () {
    if (agentRef.info.transactionName) return param('to', agentRef.info.transactionName)
    return param('t', agentRef.info.tNamePlain || 'Unnamed Transaction')
  }
}
