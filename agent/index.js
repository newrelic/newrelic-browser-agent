/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var stopwatch = require('./stopwatch')
var subscribeToUnload = require('./unload')
var harvest = require('./harvest')
var registerHandler = require('./register-handler')
var activateFeatures = require('./feature-flags')
var loader = require('loader')
var drain = require('./drain')
var navCookie = require('./nav-cookie')
var config = require('config')
var frameworks = require('framework-detection')
var metrics = require('metrics')

// api loads registers several event listeners, but does not have any exports
require('./api')

// Register event listeners and schedule harvests for performance timings.
require('./timings').init(loader, config.getConfiguration('page_view_timing'))

var autorun = typeof (window.NREUM.autorun) !== 'undefined' ? window.NREUM.autorun : true

// Features are activated using the legacy setToken function name via JSONP
window.NREUM.setToken = activateFeatures

if (require('./ie-version') === 6) loader.maxBytes = 2000
else loader.maxBytes = 30000

loader.releaseIds = {}

subscribeToUnload(finalHarvest)

registerHandler('mark', stopwatch.mark, 'api')

stopwatch.mark('done')

drain('api')

if (autorun) harvest.sendRUM(loader)

setTimeout(function() {
  for (var i = 0; i < frameworks.length; i++) {
    metrics.recordSupportability('Framework/' + frameworks[i] + '/Detected')
  }
}, 0)

// Set a cookie when the page unloads. Consume this cookie on the next page to get a 'start time'.
// The navigation start time cookie is removed when the browser supports the web timing API.
function finalHarvest (e) {
  harvest.sendFinal(loader, false)
  // write navigation start time cookie if needed
  navCookie.conditionallySet()
}
