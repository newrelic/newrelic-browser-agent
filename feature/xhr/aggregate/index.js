/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var agg = require('../../../agent/aggregator')
var register = require('../../../agent/register-handler')
var harvest = require('../../../agent/harvest')
var stringify = require('../../../agent/stringify')
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

  harvest.on('ajax', onEventsHarvestStarted)

  var scheduler = new HarvestScheduler(loader, 'ajax', { onFinished: onEventsHarvestFinished })
  scheduler.startTimer(5)
})

module.exports = storeXhr

function storeXhr (params, metrics, startTime, type) {
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
    duration: metrics.duration,
    callbackDuration: metrics.cbTime
  })
}

function onEventsHarvestStarted(options) {
  var payload = ({
    body: {
      events: events
    }
  })

  events = []
  return payload
}

function onEventsHarvestFinished(result) {
  if (result.retry) {
    // TODO: implement retry
  }
}
