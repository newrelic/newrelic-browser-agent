/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { obj as encodeObj, param as encodeParam } from '../url/encode'
import { stringify } from '../util/stringify'
import * as submitData from '../util/submit-data'
import { getLocation } from '../url/location'
import { getInfo } from '../config/info'
import { getConfigurationValue, getConfiguration } from '../config/init'
import { getRuntime } from '../config/runtime'
import { cleanURL } from '../url/clean-url'
import { eventListenerOpts } from '../event-listener/event-listener-opts'
import { SharedContext } from '../context/shared-context'
import { VERSION } from '../constants/env'
import { isWorkerScope } from '../constants/runtime'
import { warn } from '../util/console'
import { now } from '../timing/now'

const warnings = {}

/**
 * @typedef {import('./types.js').NetworkSendSpec} NetworkSendSpec
 * @typedef {import('./types.js').HarvestEndpointIdentifier} HarvestEndpointIdentifier
 * @typedef {import('./types.js').HarvestPayload} HarvestPayload
 * @typedef {import('./types.js').FeatureHarvestCallback} FeatureHarvestCallback
 * @typedef {import('./types.js').FeatureHarvestCallbackOptions} FeatureHarvestCallbackOptions
 */
export class Harvest extends SharedContext {
  constructor (parent) {
    super(parent) // gets any allowed properties from the parent and stores them in `sharedContext`

    this.tooManyRequestsDelay = getConfigurationValue(this.sharedContext.agentIdentifier, 'harvest.tooManyRequestsDelay') || 60
    this.obfuscator = getRuntime(this.sharedContext.agentIdentifier).obfuscator

    this._events = {}
  }

  /**
   * Initiate a harvest from multiple sources. An event that corresponds to the endpoint
   * name is emitted, which gives any listeners the opportunity to provide payload data.
   * Note: Used by page_action
   * @param {NetworkSendSpec} spec Specification for sending data
   */
  sendX (spec = {}) {
    const submitMethod = submitData.getSubmitMethod({ isFinalHarvest: spec.opts?.unload })
    const options = {
      retry: !spec.opts?.unload && submitMethod === submitData.xhr,
      isFinalHarvest: spec.opts?.unload === true
    }
    const payload = this.createPayload(spec.endpoint, options)
    const caller = this._send.bind(this)
    return caller({ ...spec, payload, submitMethod })
  }

  /**
   * Initiate a harvest call.
   * @param {NetworkSendSpec} spec Specification for sending data
   */
  send (spec = {}) {
    const caller = this._send.bind(this)

    return caller(spec)
  }

  /**
   * Initiate a harvest call. Typically used by `sendX` and `send` methods or called directly
   * for raw network calls.
   * @param {NetworkSendSpec} param0 Specification for sending data
   * @returns {boolean} True if the network call succeeded. For final harvest calls, the return
   * value should not be relied upon because network calls will be made asynchronously.
   */
  _send ({ endpoint, payload = {}, opts = {}, submitMethod, cbFinished, customUrl, raw, includeBaseParams = true }) {
    const info = getInfo(this.sharedContext.agentIdentifier)
    if (!info.errorBeacon) return false

    const agentRuntime = getRuntime(this.sharedContext.agentIdentifier)
    let { body, qs } = this.cleanPayload(payload)

    if (Object.keys(body).length === 0 && !opts?.sendEmptyBody) { // no payload body? nothing to send, just run onfinish stuff and return
      if (cbFinished) {
        cbFinished({ sent: false })
      }
      return false
    }

    const init = getConfiguration(this.sharedContext.agentIdentifier)
    const protocol = init.ssl === false ? 'http' : 'https'
    const perceviedBeacon = init.proxy.beacon || info.errorBeacon
    const endpointURLPart = endpoint !== 'rum' ? `/${endpoint}` : ''
    let url = `${protocol}://${perceviedBeacon}${endpointURLPart}/1/${info.licenseKey}`
    if (customUrl) url = customUrl
    if (raw) url = `${protocol}://${perceviedBeacon}/${endpoint}`

    const baseParams = !raw && includeBaseParams ? this.baseQueryString(qs, endpoint) : ''
    let payloadParams = encodeObj(qs, agentRuntime.maxBytes)
    if (!submitMethod) {
      submitMethod = submitData.getSubmitMethod({ isFinalHarvest: opts.unload })
    }
    if (baseParams === '' && payloadParams.startsWith('&')) {
      payloadParams = payloadParams.substring(1)
    }

    const fullUrl = `${url}?${baseParams}${payloadParams}`
    const gzip = !!qs?.attributes?.includes('gzip')

    if (!gzip) {
      if (endpoint === 'events') {
        body = body.e
      } else {
        body = stringify(body)
      }
      /** Warn --once per endpoint-- if the agent tries to send large payloads */
      if (body.length > 750000 && (warnings[endpoint] = (warnings?.[endpoint] || 0) + 1) === 1) warn(28, endpoint)
    }

    if (!body || body.length === 0 || body === '{}' || body === '[]') {
      // If body is null, undefined, or an empty object or array, send an empty string instead
      body = ''
    }

    const headers = []

    headers.push({ key: 'content-type', value: 'text/plain' })

    /* Since workers don't support sendBeacon right now, they can only use XHR method.
        Because they still do permit synch XHR, the idea is that at final harvest time (worker is closing),
        we just make a BLOCKING request--trivial impact--with the remaining data as a temp fill-in for sendBeacon.
       Following the removal of img-element method. */
    let result = submitMethod({ url: fullUrl, body, sync: opts.unload && (isWorkerScope), headers })

    if (!opts.unload && cbFinished && submitMethod === submitData.xhr) {
      const harvestScope = this
      result.addEventListener('loadend', function () {
        // `this` refers to the XHR object in this scope, do not change this to a fat arrow
        // status 0 refers to a local error, such as CORS or network failure, or a blocked request by the browser (e.g. adblocker)
        const cbResult = { sent: this.status !== 0, status: this.status, xhr: this, fullUrl }
        if (this.status === 429) {
          cbResult.retry = true
          cbResult.delay = harvestScope.tooManyRequestsDelay
        } else if (this.status === 408 || this.status === 500 || this.status === 503) {
          cbResult.retry = true
        }

        if (opts.needResponse) {
          cbResult.responseText = this.responseText
        }
        cbFinished(cbResult)
      }, eventListenerOpts(false))
    } else if (!opts.unload && cbFinished && submitMethod === submitData.xhrFetch) {
      const harvestScope = this
      result.then(async function (response) {
        const status = response.status
        const cbResult = { sent: true, status, fullUrl, fetchResponse: response }

        if (response.status === 429) {
          cbResult.retry = true
          cbResult.delay = harvestScope.tooManyRequestsDelay
        } else if (status === 408 || status === 500 || status === 503) {
          cbResult.retry = true
        }

        if (opts.needResponse) {
          cbResult.responseText = await response.text()
        }

        cbFinished(cbResult)
      })
    }

    return result
  }

  // The stuff that gets sent every time.
  baseQueryString (qs, endpoint) {
    const runtime = getRuntime(this.sharedContext.agentIdentifier)
    const info = getInfo(this.sharedContext.agentIdentifier)

    const ref = this.obfuscator.obfuscateString(cleanURL(getLocation()))
    const hr = runtime?.session?.state.sessionReplayMode === 1 && endpoint !== 'jserrors'

    const qps = [
      'a=' + info.applicationID,
      encodeParam('sa', (info.sa ? '' + info.sa : '')),
      encodeParam('v', VERSION),
      transactionNameParam(info),
      encodeParam('ct', runtime.customTransaction),
      '&rst=' + now(),
      '&ck=0', // ck param DEPRECATED - still expected by backend
      '&s=' + (runtime.session?.state.value || '0'), // the 0 id encaps all untrackable and default traffic
      encodeParam('ref', ref),
      encodeParam('ptid', (runtime.ptid ? '' + runtime.ptid : ''))
    ]
    if (hr) qps.push(encodeParam('hr', '1', qs))
    return qps.join('')
  }

  /**
   * Calls and accumulates data from registered harvesting functions based on
   * the endpoint being harvested.
   * @param {HarvestEndpointIdentifier} endpoint BAM endpoint identifier.
   * @param {FeatureHarvestCallbackOptions} options Options to be passed to the
   * feature harvest listener callback.
   * @returns {HarvestPayload} Payload object to transmit to the bam endpoint.
   */
  createPayload (endpoint, options) {
    const listeners = this._events[endpoint]
    const payload = {
      body: {},
      qs: {}
    }

    if (Array.isArray(listeners) && listeners.length > 0) {
      for (let i = 0; i < listeners.length; i++) {
        const singlePayload = listeners[i](options)

        if (singlePayload) {
          payload.body = {
            ...payload.body,
            ...(singlePayload.body || {})
          }
          payload.qs = {
            ...payload.qs,
            ...(singlePayload.qs || {})
          }
        }
      }
    }

    return payload
  }

  /**
   * Cleans and returns a payload object containing a body and qs
   * object with key/value pairs. KV pairs where the value is null,
   * undefined, or an empty string are removed to save on transmission
   * size.
   * @param {HarvestPayload} payload Payload to be sent to the endpoint.
   * @returns {HarvestPayload} Cleaned payload payload to be sent to the endpoint.
   */
  cleanPayload (payload = {}) {
    const clean = (input) => {
      if ((typeof Uint8Array !== 'undefined' && input instanceof Uint8Array) || Array.isArray(input)) return input
      if (typeof input === 'string') return input.length > 0 ? input : null
      return Object.entries(input || {})
        .reduce((accumulator, [key, value]) => {
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

  /**
   * Registers a function to be called when harvesting is triggered for a specific
   * endpoint.
   * @param {HarvestEndpointIdentifier} endpoint
   * @param {FeatureHarvestCallback} listener
   */
  on (endpoint, listener) {
    if (!Array.isArray(this._events[endpoint])) {
      this._events[endpoint] = []
    }

    this._events[endpoint].push(listener)
  }
}

// Constructs the transaction name param for the beacon URL.
// Prefers the obfuscated transaction name over the plain text.
// Falls back to making up a name.
function transactionNameParam (info) {
  if (info.transactionName) return encodeParam('to', info.transactionName)
  return encodeParam('t', info.tNamePlain || 'Unnamed Transaction')
}
