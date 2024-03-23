/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { stringify } from '../../../common/util/stringify'
import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { handle } from '../../../common/event-emitter/handle'
import { getConfiguration, getInfo, getRuntime } from '../../../common/config/config'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { setDenyList, shouldCollectEvent } from '../../../common/deny-list/deny-list'
import { FEATURE_NAME } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { parseGQL } from './gql'
import { getNREUMInitializedAgent } from '../../../common/window/nreum'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    const agentInit = getConfiguration(agentIdentifier)

    registerHandler('xhr', storeXhr, this.featureName, this.ee)

    this.waitForFlags(([])).then(() => {
      const scheduler = new HarvestScheduler('events', {
        onFinished: onEventsHarvestFinished,
        getPayload: prepareHarvest
      }, this)
      scheduler.startTimer(harvestTimeSeconds)
      this.drain()
    })

    const denyList = getRuntime(agentIdentifier).denyList
    setDenyList(denyList)

    let ajaxEvents = []
    let spaAjaxEvents = {}
    let sentAjaxEvents = []
    const ee = this.ee

    const harvestTimeSeconds = agentInit.ajax.harvestTimeSeconds || 10
    const MAX_PAYLOAD_SIZE = agentInit.ajax.maxPayloadSize || 1000000

    // Exposes these methods to browser test files -- future TO DO: can be removed once these fns are extracted from the constructor into class func
    this.storeXhr = storeXhr
    this.prepareHarvest = prepareHarvest
    this.getStoredEvents = function () { return { ajaxEvents, spaAjaxEvents } }

    // --- v Used by old spa feature
    ee.on('interactionDone', (interaction, wasSaved) => {
      if (!spaAjaxEvents[interaction.id]) return

      if (!wasSaved) { // if the ixn was saved, then its ajax reqs are part of the payload whereas if it was discarded, it should still be harvested in the ajax feature itself
        spaAjaxEvents[interaction.id].forEach(function (item) {
          ajaxEvents.push(item)
        })
      }
      delete spaAjaxEvents[interaction.id]
    })
    // --- ^
    // --- v Used by new soft nav
    registerHandler('returnAjax', event => ajaxEvents.push(event), this.featureName, this.ee)
    // --- ^

    const beacon = getInfo(agentIdentifier).errorBeacon
    const proxyBeacon = agentInit.proxy.beacon

    function storeXhr (params, metrics, startTime, endTime, type) {
      metrics.time = startTime

      // send to session traces
      var hash
      if (params.cat) {
        hash = stringify([params.status, params.cat])
      } else {
        hash = stringify([params.status, params.host, params.pathname])
      }

      const shouldCollect = shouldCollectEvent(params)
      const ajaxMetricDenyListEnabled = agentInit.feature_flags?.includes('ajax_metrics_deny_list')

      // store as metric
      if (shouldCollect || !ajaxMetricDenyListEnabled) {
        aggregator.store('xhr', hash, params, metrics)
      }

      if (!shouldCollect) {
        if (params.hostname === beacon || (proxyBeacon && params.hostname === proxyBeacon)) {
          // This doesn't make a distinction if the same-domain request is going to a different port or path...
          handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Events/Excluded/Agent'], undefined, FEATURE_NAMES.metrics, ee)

          if (ajaxMetricDenyListEnabled) {
            handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Metrics/Excluded/Agent'], undefined, FEATURE_NAMES.metrics, ee)
          }
        } else {
          handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Events/Excluded/App'], undefined, FEATURE_NAMES.metrics, ee)

          if (ajaxMetricDenyListEnabled) {
            handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Metrics/Excluded/App'], undefined, FEATURE_NAMES.metrics, ee)
          }
        }
        return
      }

      handle('bstXhrAgg', ['xhr', hash, params, metrics], undefined, FEATURE_NAMES.sessionTrace, ee)

      var xhrContext = this

      var event = {
        method: params.method,
        status: params.status,
        domain: params.host,
        path: params.pathname,
        requestSize: metrics.txSize,
        responseSize: metrics.rxSize,
        type,
        startTime,
        endTime,
        callbackDuration: metrics.cbTime
      }

      if (xhrContext.dt) {
        event.spanId = xhrContext.dt.spanId
        event.traceId = xhrContext.dt.traceId
        event.spanTimestamp = xhrContext.dt.timestamp
      }

      // parsed from the AJAX body, looking for operationName param & parsing query for operationType
      event.gql = params.gql = parseGQL({
        body: this.body,
        query: this?.parsedOrigin?.search
      })
      if (event.gql) handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Events/GraphQL/Bytes-Added', stringify(event.gql).length], undefined, FEATURE_NAMES.metrics, ee)

      const softNavInUse = Boolean(getNREUMInitializedAgent(agentIdentifier)?.features?.[FEATURE_NAMES.softNav])
      console.log('softNavInUse', softNavInUse)
      if (softNavInUse) { // For newer soft nav (when running), pass the event to it for evaluation -- either part of an interaction or is given back
        console.log('emit ajax')
        handle('ajax', [event], undefined, FEATURE_NAMES.softNav, ee)
      } else if (this.spaNode) { // For old spa (when running), if the ajax happened inside an interaction, hold it until the interaction finishes
        const interactionId = this.spaNode.interaction.id
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
      if (result.retry && sentAjaxEvents.length > 0) {
        ajaxEvents.unshift(...sentAjaxEvents)
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
        // gql decorators are added as custom attributes to alleviate need for new BEL schema
        var attrParts = addCustomAttributes({ ...(getInfo(agentIdentifier).jsAttributes || {}), ...(event.gql || {}) }, this.addString)
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
  }
}
