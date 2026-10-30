/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { stringify } from '../../../common/util/stringify'
import { handle } from '../../../common/event-emitter/handle'
import { setDenyList, shouldCollectEvent } from '../../../common/deny-list/deny-list'
import { FEATURE_NAME, AJAX_ID, AJAX_REASONS } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { AggregateBase } from '../../utils/aggregate-base'
import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { gosNREUMOriginals } from '../../../common/window/nreum'
import { hasGQLErrors, parseGQL } from './gql'
import { canCapturePayload, isLikelyHumanReadable, parseQueryString, createStringAdders } from '../../../common/payloads/payloads'
import { Obfuscator } from '../../../common/util/obfuscate'
import { getVersion2Attributes, getVersion2DuplicationAttributes, shouldDuplicate, isMfeTarget } from '../../../common/v2/utils'
import { EVENT_TYPES } from '../../../common/constants/events'
import { generateSpanId, generateTraceId, generateUuid } from '../../../common/ids/unique-id'
import { now } from '../../../common/timing/now'
import { isBrowserScope } from '../../../common/constants/runtime'
import { subscribeToPageUnload } from '../../../common/window/page-visibility'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME

  /** @type {Map<Object, {type: string, timer: number}>} In-flight requests, keyed by their ajax context, that have not resolved yet. */
  #pending = new Map()
  /** @type {number} Milliseconds a request has to resolve before it is reported as timed out; 0 means disabled. */
  #timeoutMs = 0
  #unloading = false

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

    const timeoutSeconds = Number(agentRef.init.ajax.timeout)
    if (timeoutSeconds > 0) this.#timeoutMs = timeoutSeconds * 1000

    registerHandler('xhr-pending', function (type) {
      classThis.#trackPending(type, this)
    }, this.featureName, this.ee)

    registerHandler('xhr', function (params, metrics, startTime, endTime, type, target) { // the EE-drain system not only switches "this" but also passes a new EventContext with info. Should consider platform refactor to another system which passes a mutable context around separately and predictably to avoid problems like this.
      classThis.#resolvePending(params, metrics, startTime, endTime, type, target, this) // this switches the context back to the class instance while passing the NR context as an argument -- see "ctx" in storeXhr
    }, this.featureName, this.ee)

    /* Only a real unload (e.g. navigating away or closing the tab) reports still-pending requests; merely hiding the page does not. Like the
     * timeout itself, this is only enabled when ajax.timeout is set. */
    if (isBrowserScope && this.#timeoutMs) subscribeToPageUnload(() => this.#reportPendingOnUnload())

    this.ee.on('long-task', (task, originator) => {
      if (originator instanceof gosNREUMOriginals().o.XHR) { // any time a long task from XHR callback is observed, update the end time for soft nav use
        const xhrMetadata = this.ee.context(originator)
        xhrMetadata.latestLongtaskEnd = task.end
      }
    })

    this.waitForFlags(([])).then(() => this.drain())
  }

  /**
   * Starts tracking a request that has been sent but not yet resolved, and arms its timeout. Nothing is tracked when ajax.timeout is disabled.
   * @param {string} type - 'xhr' or 'fetch'
   * @param {Object} ctx - The ajax context of the request
   */
  #trackPending (type, ctx) {
    if (!this.#timeoutMs || this.#pending.has(ctx)) return
    const timedOutAt = ctx.startTime + this.#timeoutMs
    /* Requests buffered before this aggregate loaded can already be past their timeout. A 0 delay still runs only after the synchronous
     * drain of the buffer, so any resolution that was also buffered gets to clear this entry first. */
    const timer = setTimeout(() => {
      /* The response may already be in while the instrument is still finishing up, e.g. reading a fetch body for payload capture. If it came
       * in time, keep waiting for that report (or, failing that, page unload) instead of calling it timed out. */
      if (ctx.endTime !== undefined && ctx.endTime <= timedOutAt) return
      this.#reportUnresolved(ctx, AJAX_REASONS.TIMED_OUT, timedOutAt)
    }, Math.max(0, timedOutAt - now()))
    this.#pending.set(ctx, { type, timer })
  }

  /**
   * Handles a request the instrument has resolved, stopping any tracking of it. One that took longer than ajax.timeout to resolve is reported as
   * timed out instead of with its real outcome. (Requests this aggregate already reported never get here, see #reportUnresolved.)
   */
  #resolvePending (params, metrics, startTime, endTime, type, target, ctx) {
    clearTimeout(this.#pending.get(ctx)?.timer)
    this.#pending.delete(ctx)

    if (this.#timeoutMs && endTime - startTime > this.#timeoutMs) this.#storeUnresolved(params, metrics.txSize, startTime, startTime + this.#timeoutMs, type, target, ctx, AJAX_REASONS.TIMED_OUT)
    else this.storeXhr(params, metrics, startTime, endTime, type, target, ctx)
  }

  /**
   * Reports a still-pending request as unresolved, once per target, and stops the instrument from reporting it again later.
   * @param {Object} ctx - The ajax context of the request
   * @param {string} reason - An AJAX_REASONS value
   * @param {number} endTime - The time to treat as the request's end
   */
  #reportUnresolved (ctx, reason, endTime) {
    const entry = this.#pending.get(ctx)
    if (!entry) return
    clearTimeout(entry.timer)
    this.#pending.delete(ctx)
    /* Marking the shared context as ended makes the instrument skip its own end-of-request processing and reporting, for a late response or a
     * cancel after unload alike: xhr's end() already returns early on it, and fetch checks it in onFetchDone and before reporting. */
    ctx.ended = true

    const txSize = ctx.metrics?.txSize ?? ctx.txSize // xhr keeps it on metrics, fetch keeps it on the context
    ;(ctx.targets || [undefined]).forEach(target => this.#storeUnresolved(ctx.params, txSize, ctx.startTime, endTime, entry.type, target, ctx, reason))
  }

  /**
   * Stores a request that has no usable response as status 0 with the given reason. Anything derived from a response is left out.
   */
  #storeUnresolved (params, txSize, startTime, endTime, type, target, ctx, reason) {
    const { cat, ...requestParams } = params || {}
    this.storeXhr(
      { ...requestParams, status: 0, reason },
      { txSize, duration: endTime - startTime, cbTime: 0 },
      startTime, endTime, type, target,
      { ...ctx, responseBody: undefined, responseHeaders: undefined }
    )
  }

  /**
   * On page unload, reports every request still in flight as unloaded and sends them straight away in their own final harvest. Browsers fire
   * pagehide either before the hidden visibility change (navigating away in the same tab) or after it (e.g. a tab hidden first, then closed). In
   * the latter case the EOL final harvest has already run and soft navigation interactions are already finalized, so these events always skip
   * soft navigations and are not left waiting for a harvest that may never come.
   * The harvest runs even with nothing pending: a browser closing a backgrounded tab cancels its in-flight requests just before pagehide, so
   * those resolve (and are stored) after the EOL final harvest and would otherwise never be sent. An empty buffer sends nothing.
   * Which requests are still pending here, rather than already cancelled by the browser, varies by browser; see UNLOAD_OUTCOMES in
   * tests/specs/ajax/unresolved-requests.e2e.js.
   */
  #reportPendingOnUnload () {
    const unloadTime = now()
    this.#unloading = true
    Array.from(this.#pending.keys()).forEach(ctx => this.#reportUnresolved(ctx, AJAX_REASONS.PAGE_UNLOADED, unloadTime))
    this.#unloading = false
    this.agentRef.runtime.harvester?.triggerHarvestFor(this, { isFinalHarvest: true })
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
    if (params.reason) event.reason = params.reason // only set when the request did not resolve normally, see AJAX_REASONS

    event.gql = parseGQL({
      body: ctx.requestBody,
      query: ctx.parsedOrigin?.search
    })
    if (event.gql) event.gql.operationHasErrors = hasGQLErrors(ctx.responseBody)

    const capturePayloadSetting = this.agentRef.init.ajax.capture_payloads
    const shouldCapturePayload = canCapturePayload(capturePayloadSetting, {
      statusCode: event.status,
      hasGQLErrors: event.gql?.operationHasErrors,
      payloadHostname: params.hostname,
      payloadHost: params.host,
      payloadPathname: params.pathname
    }, this.agentRef.beacons)

    if (shouldCapturePayload) {
      // Store raw data; obfuscation and truncation will happen in the serializer
      event.requestQuery = parseQueryString(ctx.parsedOrigin?.search)
      event.requestHeaders = ctx.requestHeaders
      event.responseHeaders = ctx.responseHeaders
      if (isLikelyHumanReadable(ctx.requestHeaders, ctx.requestBody)) event.requestBody = ctx.requestBody
      if (isLikelyHumanReadable(ctx.responseHeaders, ctx.responseBody)) event.responseBody = ctx.responseBody
    }

    if (ctx.dt) {
      event.spanId = ctx.dt.spanId
      event.traceId = ctx.dt.traceId
      // ctx.dt.timestampCorrected holds the already NR-server-time-corrected value (see distributed-tracing.js) if
      // timeKeeper was ready when the request started -- reuse it if present, otherwise correct it here now, to avoid double-correcting.
      event.spanTimestamp = ctx.dt.timestampCorrected ?? Math.floor(this.agentRef.runtime.timeKeeper.correctAbsoluteTimestamp(ctx.dt.timestamp))
    }

    if (event.gql) this.reportSupportabilityMetric('Ajax/Events/GraphQL/Bytes-Added', stringify(event.gql).length)

    /** make a copy of the event for the MFE target if it exists */
    if (isMfeTarget(target)) {
      this.events.add({ ...event, targetAttributes: getVersion2Attributes(target, this) })
      if (shouldDuplicate(target, this)) {
        const duplicateEvent = { ...event, targetAttributes: getVersion2DuplicationAttributes(target, this) }
        /** the container-duplicate copy represents the same single real HTTP call as the MFE event above, so it
         * needs its own independent trace/span identity -- otherwise the two would collide on the same
         * spanId/traceId, and BELC could not create two separate Spans/Traces from them. Only the id namespace is
         * independent; spanTimestamp is intentionally left as-is (event.spanTimestamp), since it still reflects the
         * real call's actual timing. When `event.spanId` was never set (e.g. distributed tracing is disabled), there
         * is no span identity to duplicate either -- both copies correctly end up with no spanId/traceId. */
        if (event.spanId) {
          duplicateEvent.spanId = generateSpanId()
          duplicateEvent.traceId = generateTraceId()
        }
        this.reportContainerEvent(duplicateEvent, ctx)
      }
    } else {
      this.reportContainerEvent(event, ctx)
    }
  }

  reportContainerEvent (evt, ctx) {
    const softNavInUse = Boolean(this.agentRef.features?.[FEATURE_NAMES.softNav])
    if (softNavInUse && !this.#unloading) { // when SN is running, pass the event w/ info to it for evaluation -- either part of an interaction or is given back
      handle('ajax', [evt, ctx], undefined, FEATURE_NAMES.softNav, this.ee)
    } else {
      this.events.add(evt)
    }
  }

  serializer (eventBuffer) {
    if (!eventBuffer.length) return

    const { addString, addStringRaw, addStringWithTruncation } = createStringAdders(getAddStringContext, this.obfuscator)

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
        addStringRaw(event.method),
        numeric(event.status),
        addString(event.domain),
        addString(event.path),
        numeric(event.requestSize),
        numeric(event.responseSize),
        event.type === 'fetch' ? 1 : '',
        addStringRaw(0), // nodeId
        nullable(event.spanId, addStringRaw, true) + // guid
        nullable(event.traceId, addStringRaw, true) + // traceId
        nullable(event.spanTimestamp, numeric, false) // timestamp
      ]

      let insert = '2,'

      // Since configuration objects (like info) are created new each time they are set, we have to grab the current pointer to the attr object here.
      const jsAttributes = this.agentRef.info.jsAttributes

      // Regular attributes: obfuscate only
      let regularAttrs = addCustomAttributes({
        ...(jsAttributes || {}),
        ...(event.targetAttributes || {}), // used to supply the version 2 attributes, either MFE target or duplication attributes for the main agent app
        ...(event.gql || {})
      }, { addKey: addStringRaw, addVal: addString })

      regularAttrs.push(...addCustomAttributes({
        [AJAX_ID]: event[AJAX_ID], // all AjaxRequest events should have a unique identifier to allow for easier grouping and analysis in the UI
        ...(event.reason ? { reason: event.reason } : {})
      }, { addKey: addStringRaw, addVal: addStringRaw }))

      // Payload attributes: obfuscate then truncate
      const payloadAttrs = addCustomAttributes({
        ...(event.requestBody ? { requestBody: event.requestBody } : {}),
        ...(event.requestHeaders ? { requestHeaders: event.requestHeaders } : {}),
        ...(event.requestQuery ? { requestQuery: event.requestQuery } : {}),
        ...(event.responseBody ? { responseBody: event.responseBody } : {}),
        ...(event.responseHeaders ? { responseHeaders: event.responseHeaders } : {})
      }, { addKey: addStringRaw, addVal: addStringWithTruncation })

      // .length is UTF-16 code units, not true UTF-8 byte size, so this undercounts multi-byte characters -- but it reuses the
      // already-serialized payloadAttrs strings instead of re-stringifying/byte-counting, which is worth the imprecision here.
      if (payloadAttrs.length) this.reportSupportabilityMetric('Ajax/Events/Payload/Bytes-Added', payloadAttrs.join(';').length)

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
