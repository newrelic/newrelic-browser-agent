/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import {setupLegacyAgent, defaults as nrDefaults} from 'nr-browser-common/src/window/nreum'
setupLegacyAgent()

import { mapOwn } from 'nr-browser-common/src/util/map-own'
import { ee } from 'nr-browser-common/src/event-emitter/contextual-ee'
import { protocolAllowed } from 'nr-browser-common/src/url/protocol-allowed'
import { setInfo, setConfiguration, getConfigurationValue } from 'nr-browser-common/src/config/config'
import { eventListenerOpts } from 'nr-browser-common/src/event-listener/event-listener-opts'
import {initialize as initializeErrors} from 'nr-browser-err-instrument'
import {initialize as initializeXhr} from 'nr-browser-xhr-instrument'
import '../api'

var scheme = (getConfigurationValue('ssl') === false) ? 'http' : 'https'

var win = window
var doc = win.document

var ADD_EVENT_LISTENER = 'addEventListener'
var ATTACH_EVENT = 'attachEvent'

var disabled = !protocolAllowed(win.location)
if (disabled) {
  // shut down the protocol if not allowed here...
}

// load auto-instrumentation
// var errorsInstrumentation = require('nr-browser-err-instrument')
initializeErrors()
// var xhrInstrumentation = require('nr-browser-xhr-instrument')
initializeXhr(true)

// var origin = '' + location
// TODO: set agent string here based on current version
var defInfo = {
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net',
  agent:  `js-agent.newrelic.com/${env.PATH}nr.js`
}

// api loads registers several event listeners, but does not have any exports
if (doc[ADD_EVENT_LISTENER]) {
  win[ADD_EVENT_LISTENER]('load', windowLoaded, eventListenerOpts(false))
} else {
  win[ATTACH_EVENT]('onload', windowLoaded)
}

var loadFired = 0
function windowLoaded () {
  if (loadFired++) return
  var info = NREUM.info

  console.log('info!', info)

  var firstScript = doc.getElementsByTagName('script')[0]
  // setTimeout(ee.abort, 30000)

  if (!(info && info.licenseKey && info.applicationID && firstScript)) {
    return ee.abort()
  }

  mapOwn(defInfo, function (key, val) {
    // this will overwrite any falsy value in config
    // This is intentional because agents may write an empty string to
    // the agent key in the config, in which case we want to use the default
    if (!info[key]) info[key] = val
  })

  setInfo(info)

  // set configuration from global NREUM.init
  if (NREUM.init) {
    setConfiguration(NREUM.init)
  }

  var agent = doc.createElement('script')

  if (info.agent.indexOf('http://') === 0 || info.agent.indexOf('https://') === 0) {
    agent.src = info.agent
  } else {
    agent.src = scheme + '://' + info.agent
  }

  console.log('insert script!')
  console.log('agent', agent)

  firstScript.parentNode.insertBefore(agent, firstScript)
}
