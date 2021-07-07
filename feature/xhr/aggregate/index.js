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
var config = require('config')
var HarvestScheduler = require('../../../agent/harvest-scheduler')

var ajaxEvents = []
var spaAjaxEvents = {}
var sentAjaxEvents = []

// bail if not instrumented
if (!loader.features.xhr) return

var harvestTimeSeconds = config.getConfiguration('ajax.harvestTimeSeconds') || 60

baseEE.on('feat-err', function() {
  register('xhr', storeXhr)

  harvest.on('jserrors', function() {
    return { body: agg.take([ 'xhr' ]) }
  })

  var scheduler = new HarvestScheduler(loader, 'events', { onFinished: onEventsHarvestFinished, getPayload: prepareHarvest })
  scheduler.startTimer(harvestTimeSeconds)
})

module.exports = storeXhr
module.exports.prepareHarvest = prepareHarvest
module.exports.getStoredEvents = getStoredEvents

function getStoredEvents() {
  return {
    ajaxEvents: ajaxEvents,
    spaAjaxEvents: spaAjaxEvents
  }
}

function storeXhr(params, metrics, startTime, endTime, type) {
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

  var payloadObjs = []
  for (var i = 0; i < payload.length; i++) {
    payloadObjs.push({body: {e: payload[i]}})
  }

  if (options && options.retry) {
    sentAjaxEvents = ajaxEvents.slice()
  }

  ajaxEvents = []

  return payloadObjs
}

function getPayload (events) {
  var addString = getAddStringContext()
  var ver = 'bel.7;'
  var payload = [ver]
  var payloadIdx = 0

  for (var i = 0; i < events.length; i++) {
    var event = events[i]

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

    var insert = '2,'

    // add custom attributes
    var attrParts = addCustomAttributes(loader.info.jsAttributes || {}, addString)
    fields.unshift(numeric(attrParts.length))

    insert += fields.join(',')

    if (attrParts && attrParts.length > 0) {
      insert += ';' + attrParts.join(';')
    }

    if ((i + 1) < events.length) insert += ';'

    // check if the current payload string is too big, if so then increment to a new bucket idx
    if (exceedsSizeLimit(payload[payloadIdx] + insert)) payload[++payloadIdx] = ver
    payload[payloadIdx] += insert
  }
  return payload
}

function onEventsHarvestFinished(result) {
  if (result.retry && sentAjaxEvents.length > 0) {
    ajaxEvents = ajaxEvents.concat(sentAjaxEvents)
    sentAjaxEvents = []
  }
}

function exceedsSizeLimit(payload) {
  return new Blob([payload]).size > loader.maxBytes
}
