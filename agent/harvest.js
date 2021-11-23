/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var single = require('./single')
var mapOwn = require('map-own')
var timing = require('./nav-timing')
var encode = require('./encode')
var stringify = require('./stringify')
var submitData = require('./submit-data')
var reduce = require('reduce')
var aggregator = require('./aggregator')
var stopwatch = require('./stopwatch')
var locationUtil = require('./location')
var config = require('config')

var cleanURL = require('./clean-url')

var version = '<VERSION>'
var jsonp = 'NREUM.setToken'
var _events = {}
var haveSendBeacon = !!navigator.sendBeacon
var tooManyRequestsDelay = config.getConfiguration('harvest.tooManyRequestsDelay') || 60
var scheme = (config.getConfiguration('ssl') === false) ? 'http' : 'https'

// requiring ie version updates the IE version on the loader object
var ieVersion = require('./ie-version')
var xhrUsable = ieVersion > 9 || ieVersion === 0

var addPaintMetric = require('./paint-metrics').addMetric
var eventListenerOpts = require('event-listener-opts')

module.exports = {
  sendRUM: single(sendRUM), // wrapping this in single makes it so that it can only be called once from outside
  sendFinal: sendAllFromUnload,
  sendX: sendX,
  send: send,
  on: on,
  xhrUsable: xhrUsable,
  resetListeners: resetListeners,
  getSubmitMethod: getSubmitMethod
}

// nr is injected into all send methods. This allows for easier testing
// we could require('loader') instead
function sendRUM (nr) {
  if (!nr.info.beacon) return
  if (nr.info.queueTime) aggregator.store('measures', 'qt', { value: nr.info.queueTime })
  if (nr.info.applicationTime) aggregator.store('measures', 'ap', { value: nr.info.applicationTime })

  // some time in the past some code will have called stopwatch.mark('starttime', Date.now())
  // calling measure like this will create a metric that measures the time differential between
  // the two marks.
  stopwatch.measure('be', 'starttime', 'firstbyte')
  stopwatch.measure('fe', 'firstbyte', 'onload')
  stopwatch.measure('dc', 'firstbyte', 'domContent')

  var measuresMetrics = aggregator.get('measures')

  var measuresQueryString = mapOwn(measuresMetrics, function (metricName, measure) {
    return '&' + metricName + '=' + measure.params.value
  }).join('')

  if (measuresQueryString) {
    // currently we only have one version of our protocol
    // in the future we may add more
    var protocol = '1'

    var chunksForQueryString = [baseQueryString(nr)]

    chunksForQueryString.push(measuresQueryString)

    chunksForQueryString.push(encode.param('tt', nr.info.ttGuid))
    chunksForQueryString.push(encode.param('us', nr.info.user))
    chunksForQueryString.push(encode.param('ac', nr.info.account))
    chunksForQueryString.push(encode.param('pr', nr.info.product))
    chunksForQueryString.push(encode.param('af', mapOwn(nr.features, function (k) { return k }).join(',')))

    if (window.performance && typeof (window.performance.timing) !== 'undefined') {
      var navTimingApiData = ({
        timing: timing.addPT(window.performance.timing, {}),
        navigation: timing.addPN(window.performance.navigation, {})
      })
      chunksForQueryString.push(encode.param('perf', stringify(navTimingApiData)))
    }

    if (window.performance && window.performance.getEntriesByType) {
      var entries = window.performance.getEntriesByType('paint')
      if (entries && entries.length > 0) {
        entries.forEach(function(entry) {
          if (!entry.startTime || entry.startTime <= 0) return

          if (entry.name === 'first-paint') {
            chunksForQueryString.push(encode.param('fp',
              String(Math.floor(entry.startTime))))
          } else if (entry.name === 'first-contentful-paint') {
            chunksForQueryString.push(encode.param('fcp',
              String(Math.floor(entry.startTime))))
          }
          addPaintMetric(entry.name, Math.floor(entry.startTime))
        })
      }
    }

    chunksForQueryString.push(encode.param('xx', nr.info.extra))
    chunksForQueryString.push(encode.param('ua', nr.info.userAttributes))
    chunksForQueryString.push(encode.param('at', nr.info.atts))

    var customJsAttributes = stringify(nr.info.jsAttributes)
    chunksForQueryString.push(encode.param('ja', customJsAttributes === '{}' ? null : customJsAttributes))

    var queryString = encode.fromArray(chunksForQueryString, nr.maxBytes)

    submitData.jsonp(
      scheme + '://' + nr.info.beacon + '/' + protocol + '/' + nr.info.licenseKey + queryString,
      jsonp
    )
  }
}

function sendAllFromUnload (nr) {
  var sents = mapOwn(_events, function (endpoint) {
    return sendX(endpoint, nr, { unload: true })
  })
  return reduce(sents, or)
}

function or (a, b) { return a || b }

function createPayload (type, options) {
  var makeBody = createAccumulator()
  var makeQueryString = createAccumulator()
  var listeners = (_events[type] && _events[type] || [])

  for (var i = 0; i < listeners.length; i++) {
    var singlePayload = listeners[i](options)
    if (!singlePayload) continue
    if (singlePayload.body) mapOwn(singlePayload.body, makeBody)
    if (singlePayload.qs) mapOwn(singlePayload.qs, makeQueryString)
  }
  return { body: makeBody(), qs: makeQueryString() }
}

/**
 * Initiate a harvest from multiple sources. An event that corresponds to the endpoint
 * name is emitted, which gives any listeners the opportunity to provide payload data.
 *
 * @param {string} endpoint - The endpoint of the harvest (jserrors, events, resources etc.)
 * @param {object} nr - The loader singleton.
 *
 * @param {object} opts
 * @param {bool} opts.needResponse - Specify whether the caller expects a response data.
 * @param {bool} opts.unload - Specify whether the call is a final harvest during page unload.
 */
function sendX (endpoint, nr, opts, cbFinished) {
  var submitMethod = getSubmitMethod(endpoint, opts)
  if (!submitMethod) return false
  var options = {
    retry: submitMethod.method === submitData.xhr
  }
  return _send(endpoint, nr, createPayload(endpoint, options), opts, submitMethod, cbFinished)
}

/**
 * Initiate a harvest call.
 *
 * @param {string} endpoint - The endpoint of the harvest (jserrors, events, resources etc.)
 * @param {object} nr - The loader singleton.
 *
 * @param {object} singlePayload - Object representing payload.
 * @param {object} singlePayload.qs - Map of values that should be sent as part of the request query string.
 * @param {string} singlePayload.body - String that should be sent as the body of the request.
 * @param {string} singlePayload.body.e - Special case of body used for browser interactions.
 *
 * @param {object} opts
 * @param {bool} opts.needResponse - Specify whether the caller expects a response data.
 * @param {bool} opts.unload - Specify whether the call is a final harvest during page unload.
 */
function send (endpoint, nr, singlePayload, opts, submitMethod, cbFinished) {
  var makeBody = createAccumulator()
  var makeQueryString = createAccumulator()
  if (singlePayload.body) mapOwn(singlePayload.body, makeBody)
  if (singlePayload.qs) mapOwn(singlePayload.qs, makeQueryString)

  var payload = { body: makeBody(), qs: makeQueryString() }
  return _send(endpoint, nr, payload, opts, submitMethod, cbFinished)
}

function _send (endpoint, nr, payload, opts, submitMethod, cbFinished) {
  if (!nr.info.errorBeacon) return false

  if (!payload.body) {
    if (cbFinished) {
      cbFinished({ sent: false })
    }
    return false
  }

  if (!opts) opts = {}

  var url = scheme + '://' + nr.info.errorBeacon + '/' + endpoint + '/1/' + nr.info.licenseKey + baseQueryString(nr)
  if (payload.qs) url += encode.obj(payload.qs, nr.maxBytes)

  if (!submitMethod) {
    submitMethod = getSubmitMethod(endpoint, opts)
  }
  var method = submitMethod.method
  var useBody = submitMethod.useBody

  var body
  var fullUrl = url
  if (useBody && endpoint === 'events') {
    body = payload.body.e
  } else if (useBody) {
    body = stringify(payload.body)
  } else {
    fullUrl = url + encode.obj(payload.body, nr.maxBytes)
  }

  var result = method(fullUrl, body)

  if (cbFinished && method === submitData.xhr) {
    var xhr = result
    xhr.addEventListener('load', function () {
      var result = { sent: true }
      if (this.status === 429) {
        result.retry = true
        result.delay = tooManyRequestsDelay
      } else if (this.status === 408 || this.status === 500 || this.status === 503) {
        result.retry = true
      }

      if (opts.needResponse) {
        result.responseText = this.responseText
      }
      cbFinished(result)
    }, eventListenerOpts(false))
  }

  // if beacon request failed, retry with an alternative method
  if (!result && method === submitData.beacon) {
    method = submitData.img
    result = method(url + encode.obj(payload.body, nr.maxBytes))
  }

  return result
}

function getSubmitMethod(endpoint, opts) {
  opts = opts || {}
  var method
  var useBody

  if (opts.needResponse) {
    if (xhrUsable) {
      useBody = true
      method = submitData.xhr
    } else {
      return false
    }
  } else if (opts.unload) {
    useBody = haveSendBeacon
    method = haveSendBeacon ? submitData.beacon : submitData.img
  } else {
    // `submitData.beacon` was removed, there is an upper limit to the
    // number of data allowed before it starts failing, so we save it for
    // unload data
    if (xhrUsable) {
      useBody = true
      method = submitData.xhr
    } else if (endpoint === 'events' || endpoint === 'jserrors') {
      method = submitData.img
    } else {
      return false
    }
  }

  return {
    method: method,
    useBody: useBody
  }
}

// Constructs the transaction name param for the beacon URL.
// Prefers the obfuscated transaction name over the plain text.
// Falls back to making up a name.
function transactionNameParam (nr) {
  if (nr.info.transactionName) return encode.param('to', nr.info.transactionName)
  return encode.param('t', nr.info.tNamePlain || 'Unnamed Transaction')
}

function on (type, listener) {
  var listeners = (_events[type] || (_events[type] = []))
  listeners.push(listener)
}

function resetListeners() {
  mapOwn(_events, function(key) {
    _events[key] = []
  })
}

// The stuff that gets sent every time.
function baseQueryString (nr) {
  var areCookiesEnabled = true
  if ('init' in NREUM && 'privacy' in NREUM.init) {
    areCookiesEnabled = NREUM.init.privacy.cookies_enabled
  }

  return ([
    '?a=' + nr.info.applicationID,
    encode.param('sa', (nr.info.sa ? '' + nr.info.sa : '')),
    encode.param('v', version),
    transactionNameParam(nr),
    encode.param('ct', nr.customTransaction),
    '&rst=' + nr.now(),
    '&ck=' + (areCookiesEnabled ? '1' : '0'),
    encode.param('ref', cleanURL(locationUtil.getLocation())),
    encode.param('ptid', (nr.ptid ? '' + nr.ptid : ''))
  ].join(''))
}

// returns a function that can be called to accumulate values to a single object
// when the function is called without parameters, then the accumulator is returned
function createAccumulator () {
  var accumulator = {}
  var hasData = false
  return function (key, val) {
    if (val && val.length) {
      accumulator[key] = val
      hasData = true
    }
    if (hasData) return accumulator
  }
}
