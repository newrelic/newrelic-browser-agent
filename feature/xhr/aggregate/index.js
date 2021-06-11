/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var agg = require('../../../agent/aggregator')
var register = require('../../../agent/register-handler')
var harvest = require('../../../agent/harvest')
var stringify = require('../../../agent/stringify')
var nullable = require('../../../agent/bel-serializer').nullable
var numeric = require('../../../agent/bel-serializer').numeric
var getAddStringContext = require('../../../agent/bel-serializer').getAddStringContext
var loader = require('loader')
var baseEE = require('ee')
var xhrEE = baseEE.get('xhr')
var handle = require('handle')
var HarvestScheduler = require('../../../agent/harvest-scheduler')

var events = []

// bail if not instrumented
if (!loader.features.xhr) return

baseEE.on('feat-err', function () { 
  register('xhr', storeXhr) 

  harvest.on('jserrors', function () {
    return { body: agg.take([ 'xhr' ]) }
  })

  var scheduler = new HarvestScheduler(loader, 'events', { onFinished: onEventsHarvestFinished, getPayload: prepareHarvest })
  scheduler.startTimer(5)
})

module.exports = storeXhr

function storeXhr (params, metrics, startTime, endTime, type) {
  metrics.time = startTime

  // send to session traces
  var hash
  if (params.cat) {
    hash = stringify([params.status, params.cat])
  } else {
    hash = stringify([params.status, params.host, params.pathname])
  }

  handle('bstXhrAgg', ['xhr', hash, params, metrics])

  // store as metric
  agg.store('xhr', hash, params, metrics)

  // store event
  events.push({
    method: params.method,
    status: params.status,
    domain: params.host,
    path: params.pathname,
    requestSize:  metrics.txSize,
    responseSize: metrics.rxSize,
    type: type,
    startTime: startTime,
    endTime: endTime,
    callbackDuration: metrics.cbTime
  })
}

function prepareHarvest(options) {
  var payload = getPayload(events)
  // TODO: implement retry

  events = []

  return { body:  { e: payload } }
}

function getPayload (events) {
  var addString = getAddStringContext()
  var payload = 'bel.7;'

  for (var i = 0; i < events.length; i++) {
    var event = events[i]

    payload += '2,0,'

    var fields = [
      numeric(event.startTime),
      numeric(event.endTime),
      numeric(0), // callbackEnd
      numeric(event.callbackDuration),
      addString(event.method),
      numeric(event.status),
      addString(event.domain),
      addString(event.path),
      numeric(event.requestSize),
      numeric(event.responseSize),
      event.type === 'fetch' ? 1 : '',
      addString(0), // nodeId
      nullable(null, addString, true) + // guid
      nullable(null, addString, true) + // traceId
      nullable(null, numeric, false) // timestamp
    ]

    payload += fields.join(',')

    // TODO: add custom attributes

    if ((i + 1) < events.length) payload += ';'
  }

  return payload
}

function onEventsHarvestFinished(result) {
  if (result.retry) {
    // TODO: implement retry
  }
}
