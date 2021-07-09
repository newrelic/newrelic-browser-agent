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
var MAX_PAYLOAD_SIZE = config.getConfiguration('ajax.maxPayloadSize') || 1000000

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
  options = options || {}

  if (ajaxEvents.length === 0) {
    return null
  }

  var payload = getPayload(ajaxEvents, options.maxPayloadSize || MAX_PAYLOAD_SIZE)

  var payloadObjs = []
  for (var i = 0; i < payload.length; i++) {
    payloadObjs.push({body: {e: payload[i]}})
  }

  if (options.retry) {
    sentAjaxEvents = ajaxEvents.slice()
  }

  ajaxEvents = []

  return payloadObjs
}

function getPayload (events, maxPayloadSize, chunks) {
  chunks = chunks || 1
  var payload = []
  var chunkSize = events.length / chunks
  var eventChunks = splitChunks(events, chunkSize)
  var tooBig = false
  for (var i = 0; i < eventChunks.length; i++) {
    var currentChunk = eventChunks[i]
    if (currentChunk.tooBig(maxPayloadSize)) {
      if (currentChunk.events.length !== 1) {
        /* if it is too big BUT it isnt length 1, we can split it down again,
         else we just want to NOT push it into payload
         because if it's length 1 and still too big for the maxPayloadSize
         it cant get any smaller and we dont want to recurse forever */
        tooBig = true
        break
      }
    } else {
      payload.push(currentChunk.payload)
    }
  }
  // check if the current payload string is too big, if so then run getPayload again with more buckets
  return tooBig ? getPayload(events, maxPayloadSize, ++chunks) : payload
}

function onEventsHarvestFinished(result) {
  if (result.retry && sentAjaxEvents.length > 0) {
    ajaxEvents = ajaxEvents.concat(sentAjaxEvents)
    sentAjaxEvents = []
  }
}

function splitChunks(arr, chunkSize) {
  chunkSize = chunkSize || arr.length
  var chunks = []
  for (var i = 0, len = arr.length; i < len; i += chunkSize) {
    chunks.push(new Chunk(arr.slice(i, i + chunkSize)))
  }
  return chunks
}

function Chunk (events) {
  this.addString = getAddStringContext()
  this.events = events
  this.payload = 'bel.7;'

  for (var i = 0; i < this.events.length; i++) {
    var event = this.events[i]
    var fields = [
      numeric(event.startTime),
      numeric(event.endTime - event.startTime),
      numeric(0), // callbackEnd
      numeric(0), // no callbackDuration for non-SPA events
      this.addString(event.method),
      numeric(event.status),
      this.addString(event.domain),
      this.addString(event.path),
      numeric(event.requestSize),
      numeric(event.responseSize),
      event.type === 'fetch' ? 1 : '',
      this.addString(0), // nodeId
      nullable(null, this.addString, true) + // guid
        nullable(null, this.addString, true) + // traceId
        nullable(null, numeric, false) // timestamp
    ]

    var insert = '2,'

    // add custom attributes
    var attrParts = addCustomAttributes(loader.info.jsAttributes || {}, this.addString)
    fields.unshift(numeric(attrParts.length))

    insert += fields.join(',')

    if (attrParts && attrParts.length > 0) {
      insert += ';' + attrParts.join(';')
    }

    if ((i + 1) < this.events.length) insert += ';'

    this.payload += insert
  }

  this.tooBig = function(maxPayloadSize) {
    maxPayloadSize = maxPayloadSize || MAX_PAYLOAD_SIZE
    return this.payload.length * 2 > maxPayloadSize
  }
}
