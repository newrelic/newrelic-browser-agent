/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler as register } from '../../../common/event-emitter/register-handler'
import { stringify } from '../../../common/util/stringify'
import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { handle } from '../../../common/event-emitter/handle'
import { getConfigurationValue, getInfo } from '../../../common/config/config'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { subscribeToUnload } from '../../../common/unload/unload'
import { recordSupportability } from '../../../common/metrics/metrics'
import { setDenyList, shouldCollectEvent } from './deny-list'
import { FeatureBase } from '../../../common/util/feature-base'

export class Aggregate extends FeatureBase {
  constructor(agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator)
    this.ajaxEvents = []
    this.spaAjaxEvents = {}
    this.sentAjaxEvents = []
    this.scheduler

    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'ajax.harvestTimeSeconds') || 10
    this.MAX_PAYLOAD_SIZE = getConfigurationValue(this.agentIdentifier, 'ajax.maxPayloadSize') || 1000000

    this.ee.on('interactionSaved', function (interaction) {
      if (!this.spaAjaxEvents[interaction.id]) return
      // remove from the spaAjaxEvents buffer, and let spa harvest it
      delete this.spaAjaxEvents[interaction.id]
    })

    this.ee.on('interactionDiscarded', function (interaction) {
      if (!this.spaAjaxEvents[interaction.id] || !this.allAjaxIsEnabled()) return

      this.spaAjaxEvents[interaction.id].forEach(function (item) {
        // move it from the spaAjaxEvents buffer to the ajaxEvents buffer for harvesting here
        this.ajaxEvents.push(item)
      })
      delete this.spaAjaxEvents[interaction.id]
    })

    if (this.allAjaxIsEnabled()) setDenyList(getConfigurationValue(this.agentIdentifier, 'ajax.deny_list'))

    register('xhr', (...args) => this.storeXhr(...args), undefined, this.ee)

    if (this.allAjaxIsEnabled()) {
      this.scheduler = new HarvestScheduler('events', {
        onFinished: (...args) => this.onEventsHarvestFinished(...args),
        getPayload: (...args) => this.prepareHarvest(...args)
      })
      this.scheduler.harvest.on('jserrors', function () {
        return { body: this.aggregator.take(['xhr']) }
      })
      this.scheduler.startTimer(this.harvestTimeSeconds)

      subscribeToUnload((...args) => this.finalHarvest(...args))
    }
  }

  // export { shouldCollectEvent }
  // export { setDenyList }

  getStoredEvents() {
    return {
      ajaxEvents: this.ajaxEvents,
      spaAjaxEvents: this.spaAjaxEvents
    }
  }

  storeXhr(params, metrics, startTime, endTime, type) {
    if (params.hostname === 'localhost') {
      return
    }

    metrics.time = startTime

    // send to session traces
    var hash
    if (params.cat) {
      hash = stringify([params.status, params.cat])
    } else {
      hash = stringify([params.status, params.host, params.pathname])
    }

    handle('bstXhrAgg', ['xhr', hash, params, metrics], undefined, undefined, this.ee)

    // store as metric
    this.aggregator.store('xhr', hash, params, metrics)

    if (!this.allAjaxIsEnabled()) {
      return
    }

    if (!shouldCollectEvent(params)) {
      if (params.hostname === getInfo(this.agentIdentifier).errorBeacon) {
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
      this.spaAjaxEvents[interactionId] = this.spaAjaxEvents[interactionId] || []
      this.spaAjaxEvents[interactionId].push(event)
    } else {
      this.ajaxEvents.push(event)
    }
  }

  prepareHarvest(options) {
    options = options || {}

    if (this.ajaxEvents.length === 0) {
      return null
    }

    var payload = this.getPayload(this.ajaxEvents, options.maxPayloadSize || this.MAX_PAYLOAD_SIZE)

    var payloadObjs = []
    for (var i = 0; i < payload.length; i++) {
      payloadObjs.push({ body: { e: payload[i] } })
    }

    if (options.retry) {
      this.sentAjaxEvents = this.ajaxEvents.slice()
    }

    this.ajaxEvents = []

    return payloadObjs
  }

  getPayload(events, maxPayloadSize, chunks) {
    chunks = chunks || 1
    var payload = []
    var chunkSize = events.length / chunks
    var eventChunks = this.splitChunks(events, chunkSize)
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
    return tooBig ? this.getPayload(events, maxPayloadSize, ++chunks) : payload
  }

  onEventsHarvestFinished(result) {
    if (result.retry && this.sentAjaxEvents.length > 0 && this.allAjaxIsEnabled()) {
      this.ajaxEvents = this.ajaxEvents.concat(this.sentAjaxEvents)
      this.sentAjaxEvents = []
    }
  }

  splitChunks(arr, chunkSize) {
    chunkSize = chunkSize || arr.length
    var chunks = []
    for (var i = 0, len = arr.length; i < len; i += chunkSize) {
      chunks.push(new this.Chunk(arr.slice(i, i + chunkSize)))
    }
    return chunks
  }

  Chunk(events) {
    this.addString = getAddStringContext() // pass agentIdentifier here
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
      var attrParts = addCustomAttributes(getInfo(this.agentIdentifier).jsAttributes || {}, this.addString)
      fields.unshift(numeric(attrParts.length))

      insert += fields.join(',')

      if (attrParts && attrParts.length > 0) {
        insert += ';' + attrParts.join(';')
      }

      if ((i + 1) < this.events.length) insert += ';'

      this.payload += insert
    }

    this.tooBig = function (maxPayloadSize) {
      maxPayloadSize = maxPayloadSize || this.MAX_PAYLOAD_SIZE
      return this.payload.length * 2 > maxPayloadSize
    }
  }

  allAjaxIsEnabled() {
    var enabled = getConfigurationValue(this.agentIdentifier, 'ajax.enabled')
    if (enabled === false) {
      return false
    }
    return true
  }
}
