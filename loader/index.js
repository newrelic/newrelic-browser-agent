/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var now = require('now')
var handle = require('handle')
var mapOwn = require('map-own')
var ee = require('ee')
var userAgent = require('./user-agent')
var protocolAllowed = require('./protocol-allowed')
var config = require('config')
var eventListenerOpts = require('event-listener-opts')

var scheme = (config.getConfiguration('ssl') === false) ? 'http' : 'https'

var win = window
var doc = win.document

var ADD_EVENT_LISTENER = 'addEventListener'
var ATTACH_EVENT = 'attachEvent'
var XHR = win.XMLHttpRequest
var XHR_PROTO = XHR && XHR.prototype

var disabled = !protocolAllowed(win.location)

NREUM.o = {
  ST: setTimeout,
  SI: win.setImmediate,
  CT: clearTimeout,
  XHR: XHR,
  REQ: win.Request,
  EV: win.Event,
  PR: win.Promise,
  MO: win.MutationObserver
}

var origin = '' + location
var defInfo = {
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net',
  agent: 'js-agent.newrelic.com/<PATH>nr<EXTENSION>.js'
}

var xhrWrappable = XHR &&
  XHR_PROTO &&
  XHR_PROTO[ADD_EVENT_LISTENER] &&
  !/CriOS/.test(navigator.userAgent)

var exp = module.exports = {
  offset: now.getLastTimestamp(),
  now: now,
  origin: origin,
  features: {},
  xhrWrappable: xhrWrappable,
  userAgent: userAgent,
  disabled: disabled
}

if (disabled) return

// api loads registers several event listeners, but does not have any exports
require('api')

// paint timings
require('./timings')

if (doc[ADD_EVENT_LISTENER]) {
  doc[ADD_EVENT_LISTENER]('DOMContentLoaded', loaded, eventListenerOpts(false))
  win[ADD_EVENT_LISTENER]('load', windowLoaded, eventListenerOpts(false))
} else {
  doc[ATTACH_EVENT]('onreadystatechange', stateChange)
  win[ATTACH_EVENT]('onload', windowLoaded)
}

handle('mark', ['firstbyte', now.getLastTimestamp()], null, 'api')

var loadFired = 0
function windowLoaded () {
  if (loadFired++) return
  var info = exp.info = NREUM.info

  var firstScript = doc.getElementsByTagName('script')[0]
  setTimeout(ee.abort, 30000)

  if (!(info && info.licenseKey && info.applicationID && firstScript)) {
    return ee.abort()
  }

  mapOwn(defInfo, function (key, val) {
    // this will overwrite any falsy value in config
    // This is intentional because agents may write an empty string to
    // the agent key in the config, in which case we want to use the default
    if (!info[key]) info[key] = val
  })

  var ts = now()
  handle('mark', ['onload', ts + exp.offset], null, 'api')
  handle('timing', ['load', ts])

  var agent = doc.createElement('script')

  if (info.agent.indexOf('http://') === 0 || info.agent.indexOf('https://') === 0) {
    agent.src = info.agent
  } else {
    agent.src = scheme + '://' + info.agent
  }

  firstScript.parentNode.insertBefore(agent, firstScript)
}

function stateChange () {
  if (doc.readyState === 'complete') loaded()
}

function loaded () {
  handle('mark', ['domContent', now() + exp.offset], null, 'api')
}
