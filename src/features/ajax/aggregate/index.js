/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { stringify } from '../../../common/util/stringify'
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
import Chunk from './chunk'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  #agentInfo
  #agentRuntime
  #agentInit

  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.#agentInfo = getInfo(agentIdentifier)
    this.#agentRuntime = getRuntime(agentIdentifier)
    this.#agentInit = getConfiguration(agentIdentifier)

    const harvestTimeSeconds = this.#agentInit.ajax.harvestTimeSeconds || 10
    setDenyList(this.#agentRuntime.denyList)

    this.ajaxEvents = []
    this.spaAjaxEvents = {}
    this.sentAjaxEvents = []
    const classThis = this

    // --- v Used by old spa feature
    this.ee.on('interactionDone', (interaction, wasSaved) => {
      if (!this.spaAjaxEvents[interaction.id]) return

      if (!wasSaved) { // if the ixn was saved, then its ajax reqs are part of the payload whereas if it was discarded, it should still be harvested in the ajax feature itself
        this.spaAjaxEvents[interaction.id].forEach((item) => this.ajaxEvents.push(item))
      }
      delete this.spaAjaxEvents[interaction.id]
    })
    // --- ^
    // --- v Used by new soft nav
    registerHandler('returnAjax', event => this.ajaxEvents.push(event), this.featureName, this.ee)
    // --- ^
    registerHandler('xhr', function () { // the EE-drain system not only switches "this" but also passes a new EventContext with info. Should consider platform refactor to another system which passes a mutable context around separately and predictably to avoid problems like this.
      classThis.storeXhr(...arguments, this) // this switches the context back to the class instance while passing the NR context as an argument -- see "ctx" in storeXhr
    }, this.featureName, this.ee)

    this.waitForFlags(([])).then(() => {
      const scheduler = new HarvestScheduler('events', {
        onFinished: this.onEventsHarvestFinished.bind(this),
        getPayload: this.prepareHarvest.bind(this)
      }, this)
      scheduler.startTimer(harvestTimeSeconds)
      this.drain()
    })
  }

  storeXhr (params, metrics, startTime, endTime, type, ctx) {
    metrics.time = startTime

    // send to session traces
    let hash
    if (params.cat) {
      hash = stringify([params.status, params.cat])
    } else {
      hash = stringify([params.status, params.host, params.pathname])
    }

    const shouldCollect = shouldCollectEvent(params)
    const shouldOmitAjaxMetrics = this.#agentInit.feature_flags?.includes('ajax_metrics_deny_list')

    // store for timeslice metric (harvested by jserrors feature)
    if (shouldCollect || !shouldOmitAjaxMetrics) {
      this.aggregator.store('xhr', hash, params, metrics)
    }

    if (!shouldCollect) {
      if (params.hostname === this.#agentInfo.errorBeacon || (this.#agentInit.proxy?.beacon && params.hostname === this.#agentInit.proxy.beacon)) {
        // This doesn't make a distinction if the same-domain request is going to a different port or path...
        handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Events/Excluded/Agent'], undefined, FEATURE_NAMES.metrics, this.ee)

        if (shouldOmitAjaxMetrics) handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Metrics/Excluded/Agent'], undefined, FEATURE_NAMES.metrics, this.ee)
      } else {
        handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Events/Excluded/App'], undefined, FEATURE_NAMES.metrics, this.ee)

        if (shouldOmitAjaxMetrics) handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Metrics/Excluded/App'], undefined, FEATURE_NAMES.metrics, this.ee)
      }
      return // do not send this ajax as an event
    }

    handle('bstXhrAgg', ['xhr', hash, params, metrics], undefined, FEATURE_NAMES.sessionTrace, this.ee) // have trace feature harvest AjaxNode

    const event = {
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

    if (ctx.dt) {
      event.spanId = ctx.dt.spanId
      event.traceId = ctx.dt.traceId
      event.spanTimestamp = this.#agentRuntime.timeKeeper.correctAbsoluteTimestamp(ctx.dt.timestamp)
    }

    // parsed from the AJAX body, looking for operationName param & parsing query for operationType
    event.gql = params.gql = parseGQL({
      body: ctx.body,
      query: ctx.parsedOrigin?.search
    })
    if (event.gql) handle(SUPPORTABILITY_METRIC_CHANNEL, ['Ajax/Events/GraphQL/Bytes-Added', stringify(event.gql).length], undefined, FEATURE_NAMES.metrics, this.ee)

    const softNavInUse = Boolean(getNREUMInitializedAgent(this.agentIdentifier)?.features?.[FEATURE_NAMES.softNav])
    if (softNavInUse) { // For newer soft nav (when running), pass the event to it for evaluation -- either part of an interaction or is given back
      handle('ajax', [event], undefined, FEATURE_NAMES.softNav, this.ee)
    } else if (ctx.spaNode) { // For old spa (when running), if the ajax happened inside an interaction, hold it until the interaction finishes
      const interactionId = ctx.spaNode.interaction.id
      this.spaAjaxEvents[interactionId] = this.spaAjaxEvents[interactionId] || []
      this.spaAjaxEvents[interactionId].push(event)
    } else {
      this.ajaxEvents.push(event)
    }
  }

  prepareHarvest (options) {
    options = options || {}
    if (this.ajaxEvents.length === 0) return null

    const payload = this.#getPayload(this.ajaxEvents)
    const payloadObjs = []

    for (let i = 0; i < payload.length; i++) payloadObjs.push({ body: { e: payload[i] } })

    if (options.retry) this.sentAjaxEvents = this.ajaxEvents
    this.ajaxEvents = []

    return payloadObjs
  }

  onEventsHarvestFinished (result) {
    if (result.retry && this.sentAjaxEvents.length > 0) {
      this.ajaxEvents.unshift(...this.sentAjaxEvents)
      this.sentAjaxEvents = []
    }
  }

  #getPayload (events, numberOfChunks) {
    numberOfChunks = numberOfChunks || 1
    const payload = []
    const chunkSize = events.length / numberOfChunks
    const eventChunks = splitChunks.call(this, events, chunkSize)
    let tooBig = false
    for (let i = 0; i < eventChunks.length; i++) {
      const currentChunk = eventChunks[i]
      if (currentChunk.tooBig) {
        if (currentChunk.events.length > 1) {
          tooBig = true
          break // if the payload is too big BUT is made of more than 1 event, we can split it down again
        }
        // Otherwise, if it consists of one sole event, we do not send it (discarded) since we cannot break it apart any further.
      } else {
        payload.push(currentChunk.payload)
      }
    }
    // Check if the current payload string is too big, if so then run getPayload again with more buckets.
    return tooBig ? this.#getPayload(events, ++numberOfChunks) : payload

    function splitChunks (arr, chunkSize) {
      chunkSize = chunkSize || arr.length
      const chunks = []
      for (let i = 0, len = arr.length; i < len; i += chunkSize) {
        chunks.push(new Chunk(arr.slice(i, i + chunkSize), this))
      }
      return chunks
    }
  }
}
