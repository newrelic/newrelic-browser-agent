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
var addCustomAttributes = require('../../../agent/bel-serializer').addCustomAttributes
var loader = require('loader')
var baseEE = require('ee')
var handle = require('handle')
var HarvestScheduler = require('../../../agent/harvest-scheduler')

var ajaxEvents = []
var spaAjaxEvents = {}
var sentAjaxEvents = []

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
module.exports.prepareHarvest = prepareHarvest
module.exports.getStoredEvents = getStoredEvents

function getStoredEvents () {
  return {
    ajaxEvents: ajaxEvents,
    spaAjaxEvents: spaAjaxEvents
  }
}

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

  var event = {
    method: params.method,
    status: params.status,
    domain: params.host,
    path: params.pathname,
    requestSize: metrics.txSize,
    responseSize: metrics.rxSize,
    type: type,
    startTime: startTime,
    endTime: endTime,
    callbackDuration: metrics.cbTime
  }

  // if the ajax happened inside an interaction, hold it until the interaction finishes
  if (this.spaNode) {
    var interactionId = this.spaNode.interaction.id
    spaAjaxEvents[interactionId] = spaAjaxEvents[interactionId] || []
    spaAjaxEvents[interactionId].push(event)
  } else {
    ajaxEvents.push(event)
  }
}

baseEE.on('interactionSaved', function (interaction) {
  if (!spaAjaxEvents[interaction.id]) return
  // remove from the spaAjaxEvents buffer, and let spa harvest it
  delete spaAjaxEvents[interaction.id]
})

baseEE.on('interactionDiscarded', function (interaction) {
  if (!spaAjaxEvents[interaction.id]) return

  spaAjaxEvents[interaction.id].forEach(function (item) {
    // move it from the spaAjaxEvents buffer to the ajaxEvents buffer for harvesting here
    ajaxEvents.push(item)
  })
  delete spaAjaxEvents[interaction.id]
})

function prepareHarvest(options) {
  if (ajaxEvents.length === 0) {
    return null
  }

  var payload = getPayload(ajaxEvents)

  if (options && options.retry) {
    sentAjaxEvents = ajaxEvents.slice()
  }

  ajaxEvents = []

  return { body: { e: payload } }
}

function getPayload (events) {
  var addString = getAddStringContext()
  var payload = 'bel.7;'

  for (var i = 0; i < events.length; i++) {
    var event = events[i]

    payload += '2,'

    var fields = [
      numeric(event.startTime),
      numeric(event.endTime - event.startTime),
      numeric(0), // callbackEnd
      numeric(0), // no callbackDuration for non-SPA events
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

    // add custom attributes
    var attrParts = addCustomAttributes(loader.info.jsAttributes || {}, addString)
    fields.unshift(numeric(attrParts.length))

    payload += fields.join(',')

    if (attrParts && attrParts.length > 0) {
      payload += ';' + attrParts.join(';')
    }

    if ((i + 1) < events.length) payload += ';'
  }

  return payload
}

function onEventsHarvestFinished(result) {
  if (result.retry && sentAjaxEvents.length > 0) {
    ajaxEvents = ajaxEvents.concat(sentAjaxEvents)
    sentAjaxEvents = []
  }
}
