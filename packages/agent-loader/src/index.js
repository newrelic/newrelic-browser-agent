/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var mapOwn = require('nr-browser-common').mapOwn
var ee = require('nr-browser-common').ee
var protocolAllowed = require('./protocol-allowed')
var config = require('nr-browser-common').config
var eventListenerOpts = require('nr-browser-common').eventListenerOpts

var scheme = (config.getConfiguration('ssl') === false) ? 'http' : 'https'

var win = window
var doc = win.document

var ADD_EVENT_LISTENER = 'addEventListener'
var ATTACH_EVENT = 'attachEvent'

// TODO: shutdown when protoco not allowed
var disabled = !protocolAllowed(win.location)
if (disabled) {

}

// load auto-instrumentation
var errorsInstrumentation = require('nr-browser-err-instrument')

var origin = '' + location
var defInfo = {
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net',
  agent: 'js-agent.newrelic.com/nr<EXTENSION>.js'
}

// api loads registers several event listeners, but does not have any exports
// TODO: add global API
// require('api')

if (doc[ADD_EVENT_LISTENER]) {
  win[ADD_EVENT_LISTENER]('load', windowLoaded, eventListenerOpts(false))
} else {
  win[ATTACH_EVENT]('onload', windowLoaded)
}

var loadFired = 0
function windowLoaded () {
  if (loadFired++) return
  var info = NREUM.info

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

  var agent = doc.createElement('script')

  if (info.agent.indexOf('http://') === 0 || info.agent.indexOf('https://') === 0) {
    agent.src = info.agent
  } else {
    agent.src = scheme + '://' + info.agent
  }

  firstScript.parentNode.insertBefore(agent, firstScript)
}
