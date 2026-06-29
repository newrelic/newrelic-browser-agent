/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { stringify } from '../../../common/util/stringify'
import { handle } from '../../../common/event-emitter/handle'
import { setDenyList, shouldCollectEvent } from '../../../common/deny-list/deny-list'
import { FEATURE_NAME, AJAX_ID } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { AggregateBase } from '../../utils/aggregate-base'
import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { gosNREUMOriginals } from '../../../common/window/nreum'
import { hasGQLErrors, parseGQL } from './gql'
import { canCapturePayload, isLikelyHumanReadable, parseQueryString, createStringAdders } from '../../../common/payloads/payloads'
import { Obfuscator } from '../../../common/util/obfuscate'
import { getVersion2Attributes, getVersion2DuplicationAttributes, shouldDuplicate } from '../../../common/v2/utils'
import { EVENT_TYPES } from '../../../common/constants/events'
import { generateUuid } from '../../../common/ids/unique-id'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME

  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)
    setDenyList(agentRef.runtime.denyList)
    const classThis = this

    // Create obfuscator for AJAX requests
    this.obfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX)

    if (!agentRef.init.ajax.block_internal) {
      // if the agent is tracking ITSELF, it can spawn endless ajax requests early if they are large from custom attributes, so we just disable early harvest for ajax in this case.
      super.canHarvestEarly = false
    } else {
      super.customAttributesAreSeparate = true
    }

    registerHandler('returnAjax', event => this.events.add(event), this.featureName, this.ee)

    registerHandler('xhr', function (params, metrics, startTime, endTime, type, target) { // the EE-drain system not only switches "this" but also passes a new EventContext with info. Should consider platform refactor to another system which passes a mutable context around separately and predictably to avoid problems like this.
      classThis.storeXhr(params, metrics, startTime, endTime, type, target, this) // this switches the context back to the class instance while passing the NR context as an argument -- see "ctx" in storeXhr
    }, this.featureName, this.ee)

    this.ee.on('long-task', (task, originator) => {
      if (originator instanceof gosNREUMOriginals().o.XHR) { // any time a long task from XHR callback is observed, update the end time for soft nav use
        const xhrMetadata = this.ee.context(originator)
        xhrMetadata.latestLongtaskEnd = task.end
      }
    })

    this.waitForFlags(([])).then(() => this.drain())
  }

  storeXhr (params, metrics, startTime, endTime, type, target, ctx) {
    metrics.time = startTime

    // send to session traces
    let hash
    if (params.cat) {
      hash = stringify([params.status, params.cat])
    } else {
      hash = stringify([params.status, params.host, params.pathname])
    }

    const shouldCollect = shouldCollectEvent(params)
    const shouldOmitAjaxMetrics = this.agentRef.init.feature_flags?.includes('ajax_metrics_deny_list')
    const jserrorsInUse = Boolean(this.agentRef.features?.[FEATURE_NAMES.jserrors])

    // Report ajax timeslice metric (to be harvested by jserrors feature, but only if it's running).
    if (jserrorsInUse && (shouldCollect || !shouldOmitAjaxMetrics)) {
      this.agentRef.sharedAggregator?.add(['xhr', hash, params, metrics])
    }

    if (!shouldCollect) {
      if (params.hostname === this.agentRef.info.errorBeacon || (this.agentRef.init.proxy?.beacon && params.hostname === this.agentRef.init.proxy.beacon)) {
        // This doesn't make a distinction if the same-domain request is going to a different port or path...
        this.reportSupportabilityMetric('Ajax/Events/Excluded/Agent')

        if (shouldOmitAjaxMetrics) this.reportSupportabilityMetric('Ajax/Metrics/Excluded/Agent')
      } else {
        this.reportSupportabilityMetric('Ajax/Events/Excluded/App')

        if (shouldOmitAjaxMetrics) this.reportSupportabilityMetric('Ajax/Metrics/Excluded/App')
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
      callbackDuration: metrics.cbTime,
      [AJAX_ID]: generateUuid() // all AjaxRequest events should have a unique identifier to allow for easier grouping and analysis in the UI
    }

    event.gql = params.gql = parseGQL({
      body: ctx.requestBody,
      query: ctx.parsedOrigin?.search
    })
    if (event.gql) event.gql.operationHasErrors = params.gql.operationHasErrors = hasGQLErrors(ctx.responseBody)

    const capturePayloadSetting = this.agentRef.init.ajax.capture_payloads
    const shouldCapturePayload = canCapturePayload(capturePayloadSetting, params.status, event.gql?.operationHasErrors)

    if (shouldCapturePayload) {
      // Store raw data; obfuscation and truncation will happen in the serializer
      params.requestQuery = event.requestQuery = parseQueryString(ctx.parsedOrigin?.search)
      params.requestHeaders = event.requestHeaders = ctx.requestHeaders
      params.responseHeaders = event.responseHeaders = ctx.responseHeaders
      if (isLikelyHumanReadable(ctx.requestHeaders, ctx.requestBody)) params.requestBody = event.requestBody = ctx.requestBody
      if (isLikelyHumanReadable(ctx.responseHeaders, ctx.responseBody)) params.responseBody = event.responseBody = ctx.responseBody
    }

    if (ctx.dt) {
      event.spanId = ctx.dt.spanId
      event.traceId = ctx.dt.traceId
      event.spanTimestamp = Math.floor(
        this.agentRef.runtime.timeKeeper.correctAbsoluteTimestamp(ctx.dt.timestamp)
      )
    }

    if (event.gql) this.reportSupportabilityMetric('Ajax/Events/GraphQL/Bytes-Added', stringify(event.gql).length)

    /** make a copy of the event for the MFE target if it exists */
    if (target) {
      this.events.add({ ...event, targetAttributes: getVersion2Attributes(target, this) })
      if (shouldDuplicate(target, this)) this.reportContainerEvent({ ...event, targetAttributes: getVersion2DuplicationAttributes(target, this) }, ctx)
    } else {
      this.reportContainerEvent(event, ctx)
    }
  }

  reportContainerEvent (evt, ctx) {
    const softNavInUse = Boolean(this.agentRef.features?.[FEATURE_NAMES.softNav])
    if (softNavInUse) { // when SN is running, pass the event w/ info to it for evaluation -- either part of an interaction or is given back
      handle('ajax', [evt, ctx], undefined, FEATURE_NAMES.softNav, this.ee)
    } else {
      this.events.add(evt)
    }
  }

  serializer (eventBuffer) {
    if (!eventBuffer.length) return

    const { addString, addStringWithTruncation } = createStringAdders(getAddStringContext, this.obfuscator)

    let payload = 'bel.7;'

    let firstTimestamp = 0

    for (let i = 0; i < eventBuffer.length; i++) {
      const event = eventBuffer[i]
      // ajax nodes are relative to the first node (or page origin if no previous node), so we need to calculate the relative start time
      const relativeStartTime = event.startTime - firstTimestamp
      if (i === 0) firstTimestamp = event.startTime

      const fields = [
        numeric(relativeStartTime),
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
        nullable(event.spanId, addString, true) + // guid
        nullable(event.traceId, addString, true) + // traceId
        nullable(event.spanTimestamp, numeric, false) // timestamp
      ]

      let insert = '2,'

      // Since configuration objects (like info) are created new each time they are set, we have to grab the current pointer to the attr object here.
      const jsAttributes = this.agentRef.info.jsAttributes

      // Regular attributes: obfuscate only
      const regularAttrs = addCustomAttributes({
        ...(jsAttributes || {}),
        [AJAX_ID]: event[AJAX_ID], // all AjaxRequest events should have a unique identifier to allow for easier grouping and analysis in the UI
        ...(event.targetAttributes || {}), // used to supply the version 2 attributes, either MFE target or duplication attributes for the main agent app
        ...(event.gql || {})
      }, addString, this.obfuscator)

      // Payload attributes: obfuscate then truncate
      const payloadAttrs = addCustomAttributes({
        ...(event.requestBody ? { requestBody: event.requestBody } : {}),
        ...(event.requestHeaders ? { requestHeaders: event.requestHeaders } : {}),
        ...(event.requestQuery ? { requestQuery: event.requestQuery } : {}),
        ...(event.responseBody ? { responseBody: event.responseBody } : {}),
        ...(event.responseHeaders ? { responseHeaders: event.responseHeaders } : {})
      }, addStringWithTruncation, this.obfuscator)

      const attrParts = [...regularAttrs, ...payloadAttrs]
      fields.unshift(numeric(attrParts.length))

      insert += fields.join(',')
      if (attrParts && attrParts.length > 0) {
        insert += ';' + attrParts.join(';')
      }
      if ((i + 1) < eventBuffer.length) insert += ';'

      payload += insert
    }

    return payload
  }
}
