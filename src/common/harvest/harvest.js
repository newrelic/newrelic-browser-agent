/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { obj as encodeObj, param as encodeParam } from '../url/encode'
import { stringify } from '../util/stringify'
import * as submitData from '../util/submit-data'
import { getLocation } from '../url/location'
import { getInfo, getConfigurationValue, getRuntime } from '../config/config'
import { cleanURL } from '../url/clean-url'
import { now } from '../timing/now'
import { eventListenerOpts } from '../event-listener/event-listener-opts'
import { Obfuscator } from '../util/obfuscate'
import { applyFnToProps } from '../util/traverse'
import { SharedContext } from '../context/shared-context'
import { VERSION } from '../constants/env'
import { isWorkerScope } from '../constants/runtime'

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
    this.obfuscator = new Obfuscator(this.sharedContext)
    this.getScheme = () => (getConfigurationValue(this.sharedContext.agentIdentifier, 'ssl') === false) ? 'http' : 'https'

    this._events = {}
  }

  /**
   * Initiate a harvest from multiple sources. An event that corresponds to the endpoint
   * name is emitted, which gives any listeners the opportunity to provide payload data.
   * @param {NetworkSendSpec} spec Specification for sending data
   */
  sendX (spec = {}) {
    const submitMethod = submitData.getSubmitMethod({ isFinalHarvest: spec.opts?.unload })
    var options = {
      retry: !spec.opts?.unload && submitMethod === submitData.xhr
    }
    const payload = this.createPayload(spec.endpoint, options)
    var caller = this.obfuscator.shouldObfuscate() ? this.obfuscateAndSend.bind(this) : this._send.bind(this)
    return caller({ ...spec, payload, submitMethod })
  }

  /**
   * Initiate a harvest call.
   * @param {NetworkSendSpec} spec Specification for sending data
   */
  send (spec = {}) {
    var caller = this.obfuscator.shouldObfuscate() ? this.obfuscateAndSend.bind(this) : this._send.bind(this)

    return caller({ ...spec, payload: this.cleanPayload(spec.payload) })
  }

  /**
   * Apply obfuscation rules to the payload and then initial the harvest network call.
   * @param {NetworkSendSpec} spec Specification for sending data
   */
  obfuscateAndSend (spec = {}) {
    const { payload = {} } = spec
    applyFnToProps(payload, (...args) => this.obfuscator.obfuscateString(...args), 'string', ['e'])
    return this._send({ ...spec, payload })
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

    if (!payload.body && !opts?.sendEmptyBody) { // no payload body? nothing to send, just run onfinish stuff and return
      if (cbFinished) {
        cbFinished({ sent: false })
      }
      return false
    }

    let url = ''
    if (customUrl) url = customUrl
    else if (raw) url = `${this.getScheme()}://${info.errorBeacon}/${endpoint}`
    else url = `${this.getScheme()}://${info.errorBeacon}${endpoint !== 'rum' ? `/${endpoint}` : ''}/1/${info.licenseKey}`

    const baseParams = !raw && includeBaseParams ? this.baseQueryString() : ''
    const payloadParams = payload.qs ? encodeObj(payload.qs, agentRuntime.maxBytes) : ''
    if (!submitMethod) {
      submitMethod = submitData.getSubmitMethod(opts)
    }

    let body
    const fullUrl = `${url}?${baseParams}${payloadParams}`

    const gzip = payload?.qs?.content_encoding === 'gzip'

    if (!gzip) {
      if (endpoint === 'events') {
        body = payload.body.e
      } else {
        body = stringify(payload.body)
      }
    } else body = payload.body

    if (!body || body.length === 0 || body === '{}' || body === '[]') {
      // If body is null, undefined, or an empty object or array, send an empty string instead
      body = ''
    }

    // Get bytes harvested per endpoint as a supportability metric. See metrics aggregator (on unload).
    agentRuntime.bytesSent[endpoint] = (agentRuntime.bytesSent[endpoint] || 0) + body?.length || 0
    // Get query bytes harvested per endpoint as a supportability metric. See metrics aggregator (on unload).
    agentRuntime.queryBytesSent[endpoint] = (agentRuntime.queryBytesSent[endpoint] || 0) + fullUrl.split('?').slice(-1)[0]?.length || 0

    const headers = []

    headers.push({ key: 'content-type', value: 'text/plain' })

    /* Since workers don't support sendBeacon right now, or Image(), they can only use XHR method.
        Because they still do permit synch XHR, the idea is that at final harvest time (worker is closing),
        we just make a BLOCKING request--trivial impact--with the remaining data as a temp fill-in for sendBeacon. */

    var result = submitMethod({ url: fullUrl, body, sync: opts.unload && isWorkerScope, headers })

    if (!opts.unload && cbFinished && submitMethod === submitData.xhr) {
      var xhr = result
      xhr.addEventListener('load', function () {
        var result = { sent: true, status: this.status }
        if (this.status === 429) {
          result.retry = true
          result.delay = this.tooManyRequestsDelay
        } else if (this.status === 408 || this.status === 500 || this.status === 503) {
          result.retry = true
        }

        if (opts.needResponse) {
          result.responseText = this.responseText
        }
        cbFinished(result)
      }, eventListenerOpts(false))
    }

    // if beacon request failed, retry with an alternative method -- will not happen for workers
    if (!result && submitMethod === submitData.beacon) {
      // browsers that support sendBeacon also support fetch with keepalive - IE will not retry unload calls
      submitMethod = submitData.fetchKeepAlive
      result = submitMethod({ url: fullUrl + encodeObj(payload.body, agentRuntime.maxBytes) })
    }

    return result
  }

  // The stuff that gets sent every time.
  baseQueryString () {
    var runtime = getRuntime(this.sharedContext.agentIdentifier)
    var info = getInfo(this.sharedContext.agentIdentifier)

    var location = cleanURL(getLocation())
    var ref = this.obfuscator.shouldObfuscate() ? this.obfuscator.obfuscateString(location) : location

    return ([
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
    ].join(''))
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
    const payload = {}

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

    return this.cleanPayload(payload)
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
    const clean = (input = {}) => Object.entries(input)
      .reduce((accumulator, [key, value]) => {
        if (value !== null && value !== undefined && value.toString()?.length) {
          accumulator[key] = value
        }

        return accumulator
      }, {})

    return clean({
      body: payload.body,
      qs: payload.qs
    })
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
