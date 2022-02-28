/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import {setupLegacyAgent, defaults as nrDefaults, getOrSetNREUM} from 'nr-browser-common/src/window/nreum'
setupLegacyAgent()

import '../api'
import { ee } from 'nr-browser-common/src/event-emitter/contextual-ee'
import { protocolAllowed } from 'nr-browser-common/src/url/protocol-allowed'
import { setInfo, setConfiguration, getConfigurationValue } from 'nr-browser-common/src/config/config'
import {initialize as initializeErrors} from 'nr-browser-err-instrument'
import {initialize as initializeXhr} from 'nr-browser-xhr-instrument'
import { listenForLoad } from 'nr-browser-document-load'


var scheme = (!getConfigurationValue('ssl')) ? 'http' : 'https'
console.log("scheme", scheme)

var win = window
var doc = win.document

// var ADD_EVENT_LISTENER = 'addEventListener'
// var ATTACH_EVENT = 'attachEvent'

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
// var defInfo = {
//   beacon: 'bam.nr-data.net',
//   errorBeacon: 'bam.nr-data.net',
//   agent:  `js-agent.newrelic.com/${env.PATH}nr.js`
// }

// api loads registers several event listeners, but does not have any exports
// if (doc[ADD_EVENT_LISTENER]) {
//   win[ADD_EVENT_LISTENER]('load', windowLoaded, eventListenerOpts(false))
// } else {
//   win[ATTACH_EVENT]('onload', windowLoaded)
// }

var loadFired = 0
function windowLoaded () {
  console.log("WINDOW LOADED!")
  const nr = getOrSetNREUM()
  if (loadFired++) return
  var info = nr.info


  var firstScript = doc.getElementsByTagName('script')[0]
  // setTimeout(ee.abort, 30000)


  if (!(info && info.licenseKey && info.applicationID && firstScript)) {
    return ee.abort()
  }


  if (!info.agent){
    info.agent = nrDefaults.agent
  }

  console.log('info!', info)

  // mapOwn(defInfo, function (key, val) {
  //   // this will overwrite any falsy value in config
  //   // This is intentional because agents may write an empty string to
  //   // the agent key in the config, in which case we want to use the default
  //   if (!info[key]) info[key] = val
  // })

  setInfo(info)

  // set configuration from global NREUM.init
  if (nr.init) {
    setConfiguration(nr.init)
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

listenForLoad(windowLoaded)