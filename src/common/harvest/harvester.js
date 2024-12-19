import { FEATURE_TO_ENDPOINT, JSERRORS, RUM, EVENTS, FEATURE_NAMES } from '../../loaders/features/features'
import { VERSION } from '../constants/env'
import { globalScope, isWorkerScope } from '../constants/runtime'
import { eventListenerOpts } from '../event-listener/event-listener-opts'
import { SESSION_EVENTS } from '../session/constants'
import { now } from '../timing/now'
import { subscribeToEOL } from '../unload/eol'
import { cleanURL } from '../url/clean-url'
import { obj, param } from '../url/encode'
import { warn } from '../util/console'
import { stringify } from '../util/stringify'
import { getSubmitMethod, xhr as xhrMethod, xhrFetch as fetchMethod } from '../util/submit-data'

export class Harvester {
  constructor (agentRef) {
    this.agentRef = agentRef

    const WHILE_TESTING = { [FEATURE_NAMES.pageViewEvent]: true } // while transitioning from old harvest, porting one feature at a time
    const featuresInstruments = Object.values(agentRef.features).filter(feature => WHILE_TESTING[feature.featureName])

    // const featuresInstruments = Object.values(agentRef.features)
    Promise.all(featuresInstruments.map(feature => feature.onAggregateImported)).then(loadedSuccessfullyArr => {
      // Double check that all aggregates have been initialized, successfully or not, before starting harvest schedule, which only queries the succesfully loaded ones.
      const featuresToHarvest = featuresInstruments.filter((instrumentInstance, index) => loadedSuccessfullyArr[index])
      this.initializedAggregates = featuresToHarvest.map(instrumentInstance => instrumentInstance.featAggregate)
      this.#startTimer(agentRef.init.harvest.interval)
    })

    subscribeToEOL(() => { // do one last harvest round or check
      this.initializedAggregates?.forEach(aggregateInst => { // let all features wrap up things needed to do before ANY harvest in case there's last minute cross-feature data dependencies
        if (typeof aggregateInst.harvestOpts.beforeUnload === 'function') aggregateInst.harvestOpts.beforeUnload()
      })
      this.initializedAggregates?.forEach(aggregateInst => this.triggerHarvestFor(aggregateInst, { isFinalHarvest: true }))
    })

    /* Flush all buffered data if session resets and give up retries. This should be synchronous to ensure that the correct `session` value is sent.
      Since session-reset generates a new session ID and the ID is grabbed at send-time, any delays or retries would cause the payload to be sent under the wrong session ID. */
    agentRef.ee.on(SESSION_EVENTS.RESET, () => this.initializedAggregates?.forEach(aggregateInst => this.triggerHarvestFor(aggregateInst, { forceNoRetry: true })))
  }

  #startTimer (harvestInterval) {
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
    if (aggregateInst.blocked) return false

    const submitMethod = getSubmitMethod(localOpts)
    if (!submitMethod) return false

    const shouldRetryOnFail = !localOpts.isFinalHarvest && submitMethod === xhrMethod // always retry all features harvests except for final
    let dataToSendArr; let ranSend = false
    if (!localOpts.directSend) { // primarily used by rum call to bypass makeHarvestPayload by providing payload directly
      dataToSendArr = aggregateInst.makeHarvestPayload(shouldRetryOnFail) // be sure the 'this' of makeHarvestPayload is the aggregate w/ access to its harvestOpts
      if (!dataToSendArr) return false // can be undefined if storage is empty or preharvest checks failed
    } else dataToSendArr = [localOpts.directSend]

    dataToSendArr.forEach(({ targetApp, payload }) => {
      if (!payload) return

      send(this.agentRef, {
        endpoint: FEATURE_TO_ENDPOINT[aggregateInst.featureName],
        targetApp,
        payload,
        localOpts,
        submitMethod,
        cbFinished,
        raw: aggregateInst.harvestOpts.raw
      })
      ranSend = true
    })
    return ranSend

    /**
     * This is executed immediately after harvest sends the data via XHR, or if there's nothing to send. Note that this excludes on unloading / sendBeacon.
     * @param {Object} result - information regarding the result of the harvest attempt
     */
    function cbFinished (result) {
      if (localOpts.forceNoRetry) result.retry = false // discard unsent data rather than re-queuing for next harvest attempt
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
function send (agentRef, { endpoint, targetApp, payload, localOpts = {}, submitMethod, cbFinished, raw }) {
  if (!agentRef.info.errorBeacon) return false

  let { body, qs } = cleanPayload(payload)

  if (Object.keys(body).length === 0 && !localOpts.sendEmptyBody) { // if there's no body to send, just run onfinish stuff and return
    if (cbFinished) cbFinished({ sent: false, targetApp })
    return false
  }

  const protocol = agentRef.init.ssl === false ? 'http' : 'https'
  const perceivedBeacon = agentRef.init.proxy.beacon || agentRef.info.errorBeacon
  const url = raw
    ? `${protocol}://${perceivedBeacon}/${endpoint}`
    : `${protocol}://${perceivedBeacon}${endpoint !== RUM ? '/' + endpoint : ''}/1/${targetApp.licenseKey}`
  const baseParams = !raw ? baseQueryString(agentRef, qs, endpoint, targetApp.appId) : ''
  let payloadParams = obj(qs, agentRef.runtime.maxBytes)
  if (baseParams === '' && payloadParams.startsWith('&')) {
    payloadParams = payloadParams.substring(1)
  }

  const fullUrl = `${url}?${baseParams}${payloadParams}`
  const gzip = !!qs?.attributes?.includes('gzip')
  if (!gzip) {
    if (endpoint !== EVENTS) body = stringify(body) // all features going to 'events' endpoint should already be serialized & stringified
    // Warn--once per endpoint--if the agent tries to send large payloads
    if (body.length > 750000 && (warnings[endpoint] = (warnings[endpoint] || 0) + 1) === 1) warn(28, endpoint)
  }

  // If body is null, undefined, or an empty object or array after stringifying, send an empty string instead.
  if (!body || body.length === 0 || body === '{}' || body === '[]') body = ''

  const headers = [{ key: 'content-type', value: 'text/plain' }]

  /* Since workers don't support sendBeacon right now, they can only use XHR method.
      Because they still do permit synch XHR, the idea is that at final harvest time (worker is closing),
      we just make a BLOCKING request--trivial impact--with the remaining data as a temp fill-in for sendBeacon.
     Following the removal of img-element method. */
  let result = submitMethod({ url: fullUrl, body, sync: localOpts.isFinalHarvest && isWorkerScope, headers })

  if (!localOpts.isFinalHarvest && cbFinished) { // final harvests don't hold onto buffer data (shouldRetryOnFail is false), so cleanup isn't needed
    if (submitMethod === xhrMethod) {
      result.addEventListener('loadend', function () {
        // status 0 refers to a local error, such as CORS or network failure, or a blocked request by the browser (e.g. adblocker)
        const cbResult = { sent: this.status !== 0, status: this.status, xhr: this, fullUrl, targetApp }
        // `this` here in block refers to the XHR object in this scope, do not change the anon function to an arrow function
        switch (this.status) {
          case 429:
          case 408:
          case 500:
          case 503:
            cbResult.retry = true
            break
        }
        if (localOpts.needResponse) {
          cbResult.responseText = this.responseText
        }
        cbFinished(cbResult)
      }, eventListenerOpts(false))
    } else if (submitMethod === fetchMethod) {
      result.then(async function (response) {
        const status = response.status
        const cbResult = { sent: true, status, fullUrl, fetchResponse: response, targetApp }
        switch (status) {
          case 429:
          case 408:
          case 500:
          case 503:
            cbResult.retry = true
            break
        }
        if (localOpts.needResponse) {
          cbResult.responseText = await response.text()
        }
        cbFinished(cbResult)
      })
    }
  }
  return true
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
    if (typeof input === 'string') return input.length > 0 ? input : null
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
function baseQueryString (agentRef, qs, endpoint, applicationID) {
  const ref = agentRef.runtime.obfuscator.obfuscateString(cleanURL('' + globalScope.location))
  const hr = agentRef.runtime.session?.state.sessionReplayMode === 1 && endpoint !== JSERRORS

  const qps = [
    'a=' + applicationID,
    param('sa', (agentRef.info.sa ? '' + agentRef.info.sa : '')),
    param('v', VERSION),
    transactionNameParam(),
    param('ct', agentRef.runtime.customTransaction),
    '&rst=' + now(),
    '&ck=0', // ck param DEPRECATED - still expected by backend
    '&s=' + (agentRef.runtime.session?.state.value || '0'), // the 0 id encaps all untrackable and default traffic
    param('ref', ref),
    param('ptid', (agentRef.runtime.ptid ? '' + agentRef.runtime.ptid : ''))
  ]
  if (hr) qps.push(param('hr', '1', qs))
  return qps.join('')

  // Constructs the transaction name param for the beacon URL.
  // Prefers the obfuscated transaction name over the plain text.
  // Falls back to making up a name.
  function transactionNameParam () {
    if (agentRef.info.transactionName) return param('to', agentRef.info.transactionName)
    return param('t', agentRef.info.tNamePlain || 'Unnamed Transaction')
  }
}
