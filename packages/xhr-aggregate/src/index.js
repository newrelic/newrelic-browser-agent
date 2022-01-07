/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var agg = require('nr-browser-core').internal.aggregator
var register = require('nr-browser-core').internal.registerHandler
var harvest = require('nr-browser-core').internal.harvest
var stringify = require('nr-browser-core').internal.stringify
var nullable = require('nr-browser-core').internal.belSerializer.nullable
var numeric = require('nr-browser-core').internal.belSerializer.numeric
var getAddStringContext = require('nr-browser-core').internal.belSerializer.getAddStringContext
var addCustomAttributes = require('nr-browser-core').internal.belSerializer.addCustomAttributes
var baseEE = require('nr-browser-common').ee
var handle = require('nr-browser-common').handle
var config = require('nr-browser-common').config
var HarvestScheduler = require('nr-browser-core').internal.harvestScheduler
var setDenyList = require('./deny-list').setDenyList
var shouldCollectEvent = require('./deny-list').shouldCollectEvent
var subscribeToUnload = require('nr-browser-core').internal.unload
var recordSupportability = require('nr-browser-common').metrics.recordSupportability

var ajaxEvents = []
var spaAjaxEvents = {}
var sentAjaxEvents = []
var scheduler

var harvestTimeSeconds = config.getConfiguration('ajax.harvestTimeSeconds') || 60
var MAX_PAYLOAD_SIZE = config.getConfiguration('ajax.maxPayloadSize') || 1000000

if (allAjaxIsEnabled()) setDenyList(config.getConfiguration('ajax.deny_list'))

// baseEE.on('feat-err', initialize) 

function initialize() {
  register('xhr', storeXhr)

  harvest.on('jserrors', function() {
    return { body: agg.take([ 'xhr' ]) }
  })

  if (allAjaxIsEnabled()) {
    scheduler = new HarvestScheduler('events', { onFinished: onEventsHarvestFinished, getPayload: prepareHarvest })
    scheduler.startTimer(harvestTimeSeconds)

    subscribeToUnload(finalHarvest)
  }
}

module.exports.storeXhr = storeXhr
module.exports.initialize = initialize
module.exports.prepareHarvest = prepareHarvest
module.exports.getStoredEvents = getStoredEvents
module.exports.shouldCollectEvent = shouldCollectEvent
module.exports.setDenyList = setDenyList

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

  if (!allAjaxIsEnabled()) {
    return
  }

  if (!shouldCollectEvent(params)) {
    if (params.hostname === config.getInfo().errorBeacon) {
      recordSupportability('Ajax/Events/Excluded/Agent')
    } else {
      recordSupportability('Ajax/Events/Excluded/App')
    }
    return
  }

  var xhrContext = this

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

  if (xhrContext.dt) {
    event.spanId = xhrContext.dt.spanId
    event.traceId = xhrContext.dt.traceId
    event.spanTimestamp = xhrContext.dt.timestamp
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
  if (!spaAjaxEvents[interaction.id] || !allAjaxIsEnabled()) return

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
  if (result.retry && sentAjaxEvents.length > 0 && allAjaxIsEnabled()) {
    ajaxEvents = ajaxEvents.concat(sentAjaxEvents)
    sentAjaxEvents = []
  }
}

function finalHarvest() {
  scheduler.runHarvest({ unload: true })
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
      nullable(event.spanId, this.addString, true) + // guid
      nullable(event.traceId, this.addString, true) + // traceId
      nullable(event.spanTimestamp, numeric, false) // timestamp
    ]

    var insert = '2,'

    // add custom attributes
    var attrParts = addCustomAttributes(config.getInfo().jsAttributes || {}, this.addString)
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

function allAjaxIsEnabled() {
  var enabled = config.getConfiguration('ajax.enabled')
  if (enabled === false) {
    return false
  }
  return true
}
