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
import { setDenyList, shouldCollectEvent } from '../../../common/deny-list/deny-list'
import { FEATURE_NAME } from '../constants'
import { drain } from '../../../common/drain/drain'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { FeatureBase } from '../../utils/feature-base'

export class Aggregate extends FeatureBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    let ajaxEvents = []
    let spaAjaxEvents = {}
    let sentAjaxEvents = []
    let scheduler

    const ee = this.ee

    const harvestTimeSeconds = getConfigurationValue(agentIdentifier, 'ajax.harvestTimeSeconds') || 10
    const MAX_PAYLOAD_SIZE = getConfigurationValue(agentIdentifier, 'ajax.maxPayloadSize') || 1000000

    // Exposes these methods to browser test files -- future TO DO: can be removed once these fns are extracted from the constructor into class func
    this.storeXhr = storeXhr
    this.prepareHarvest = prepareHarvest
    this.getStoredEvents = function () { return { ajaxEvents, spaAjaxEvents } }

    ee.on('interactionSaved', (interaction) => {
      if (!spaAjaxEvents[interaction.id]) return
      // remove from the spaAjaxEvents buffer, and let spa harvest it
      delete spaAjaxEvents[interaction.id]
    })

    ee.on('interactionDiscarded', (interaction) => {
      if (!spaAjaxEvents[interaction.id] || !allAjaxIsEnabled()) return

      spaAjaxEvents[interaction.id].forEach(function (item) {
        // move it from the spaAjaxEvents buffer to the ajaxEvents buffer for harvesting here
        ajaxEvents.push(item)
      })
      delete spaAjaxEvents[interaction.id]
    })

    if (allAjaxIsEnabled()) setDenyList(getConfigurationValue(agentIdentifier, 'ajax.deny_list'))

    register('xhr', storeXhr, this.featureName, this.ee)

    if (allAjaxIsEnabled()) {
      scheduler = new HarvestScheduler('events', {
        onFinished: onEventsHarvestFinished,
        getPayload: prepareHarvest
      }, this)

      ee.on(`drain-${this.featureName}`, () => { scheduler.startTimer(harvestTimeSeconds) })
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

      handle('bstXhrAgg', ['xhr', hash, params, metrics], undefined, FEATURE_NAMES.sessionTrace, ee)

      // store as metric
      aggregator.store('xhr', hash, params, metrics)

      if (!allAjaxIsEnabled()) {
        return
      }

      if (!shouldCollectEvent(params)) {
        if (params.hostname === getInfo(agentIdentifier).errorBeacon) {
          handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Events/Excluded/Agent'], undefined, FEATURE_NAMES.metrics, ee)
        } else {
          handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Events/Excluded/App'], undefined, FEATURE_NAMES.metrics, ee)
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

    function prepareHarvest (options) {
      options = options || {}

      if (ajaxEvents.length === 0) {
        return null
      }

      var payload = getPayload(ajaxEvents, options.maxPayloadSize || MAX_PAYLOAD_SIZE)

      var payloadObjs = []
      for (var i = 0; i < payload.length; i++) {
        payloadObjs.push({ body: { e: payload[i] } })
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

    function onEventsHarvestFinished (result) {
      if (result.retry && sentAjaxEvents.length > 0 && allAjaxIsEnabled()) {
        ajaxEvents = ajaxEvents.concat(sentAjaxEvents)
        sentAjaxEvents = []
      }
    }

    function splitChunks (arr, chunkSize) {
      chunkSize = chunkSize || arr.length
      var chunks = []
      for (var i = 0, len = arr.length; i < len; i += chunkSize) {
        chunks.push(new Chunk(arr.slice(i, i + chunkSize)))
      }
      return chunks
    }

    function Chunk (events) {
      this.addString = getAddStringContext(agentIdentifier) // pass agentIdentifier here
      this.events = events
      this.payload = 'bel.7;'

      for (var i = 0; i < events.length; i++) {
        var event = events[i]
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
        var attrParts = addCustomAttributes(getInfo(agentIdentifier).jsAttributes || {}, this.addString)
        fields.unshift(numeric(attrParts.length))

        insert += fields.join(',')

        if (attrParts && attrParts.length > 0) {
          insert += ';' + attrParts.join(';')
        }

        if ((i + 1) < events.length) insert += ';'

        this.payload += insert
      }

      this.tooBig = function (maxPayloadSize) {
        maxPayloadSize = maxPayloadSize || MAX_PAYLOAD_SIZE
        return this.payload.length * 2 > maxPayloadSize
      }
    }

    function allAjaxIsEnabled () {
      var enabled = getConfigurationValue(agentIdentifier, 'ajax.enabled')
      if (enabled === false) {
        return false
      }
      return true
    }

    drain(this.agentIdentifier, this.featureName)
  }
}
