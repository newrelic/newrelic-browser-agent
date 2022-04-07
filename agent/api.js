/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var register = require('./register-handler')
var harvest = require('./harvest')
var agg = require('./aggregator')
var single = require('./single')
var submitData = require('./submit-data')
var mapOwn = require('map-own')
var loader = require('loader')
var handle = require('handle')
var config = require('config')
var metrics = require('metrics')
var cycle = 0

var scheme = (config.getConfiguration('ssl') === false) ? 'http' : 'https'

harvest.on('jserrors', function () {
  return { body: agg.take(['cm', 'sm']) }
})

// process buffered metric data
register('storeMetric', storeMetric, 'api')
register('storeEventMetrics', storeEventMetrics, 'api')

var api = {
  finished: single(finished),
  setPageViewName: setPageViewName,
  setErrorHandler: setErrorHandler,
  addToTrace: addToTrace,
  inlineHit: inlineHit,
  addRelease: addRelease
}

// Hook all of the api functions up to the queues/stubs created in loader/api.js
mapOwn(api, function (fnName, fn) {
  register('api-' + fnName, fn, 'api')
})

// All API functions get passed the time they were called as their
// first parameter. These functions can be called asynchronously.

function storeMetric(type, name, params, value) {
  agg.storeMetric(type, name, params, value)
}

function storeEventMetrics(type, name, params, metrics) {
  agg.store(type, name, params, metrics)
}

function setPageViewName(t, name, host) {
  if (typeof name !== 'string') return
  if (name.charAt(0) !== '/') name = '/' + name
  loader.customTransaction = (host || 'http://custom.transaction') + name
}

function finished(t, providedTime) {
  var time = providedTime ? providedTime - loader.offset : t
  metrics.recordCustom('finished', { time: time })
  addToTrace(t, { name: 'finished', start: time + loader.offset, origin: 'nr' })
  handle('api-addPageAction', [time, 'finished'])
}

function addToTrace(t, evt) {
  if (!(evt && typeof evt === 'object' && evt.name && evt.start)) return

  var report = {
    n: evt.name,
    s: evt.start - loader.offset,
    e: (evt.end || evt.start) - loader.offset,
    o: evt.origin || '',
    t: 'api'
  }

  handle('bstApi', [report])
}

// NREUM.inlineHit(request_name, queue_time, app_time, total_be_time, dom_time, fe_time)
//
// request_name - the 'web page' name or service name
// queue_time - the amount of time spent in the app tier queue
// app_time - the amount of time spent in the application code
// total_be_time - the total roundtrip time of the remote service call
// dom_time - the time spent processing the result of the service call (or user defined)
// fe_time - the time spent rendering the result of the service call (or user defined)
function inlineHit(t, request_name, queue_time, app_time, total_be_time, dom_time, fe_time) {
  request_name = window.encodeURIComponent(request_name)
  cycle += 1

  if (!loader.info.beacon) return

  var url = scheme + '://' + loader.info.beacon + '/1/' + loader.info.licenseKey

  url += '?a=' + loader.info.applicationID + '&'
  url += 't=' + request_name + '&'
  url += 'qt=' + ~~queue_time + '&'
  url += 'ap=' + ~~app_time + '&'
  url += 'be=' + ~~total_be_time + '&'
  url += 'dc=' + ~~dom_time + '&'
  url += 'fe=' + ~~fe_time + '&'
  url += 'c=' + cycle

  submitData.img(url)
}

function setErrorHandler(t, handler) {
  loader.onerror = handler
}

var releaseCount = 0
function addRelease(t, name, id) {
  if (++releaseCount > 10) return
  loader.releaseIds[name.slice(-200)] = ('' + id).slice(-200)
}
