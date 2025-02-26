/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { stringify } from '../../../common/util/stringify'
import { handle } from '../../../common/event-emitter/handle'
import { setDenyList, shouldCollectEvent } from '../../../common/deny-list/deny-list'
import { FEATURE_NAME } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { AggregateBase } from '../../utils/aggregate-base'
import { parseGQL } from './gql'
import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME

  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)
    setDenyList(agentRef.runtime.denyList)
    this.underSpaEvents = {}
    const classThis = this

    // --- v Used by old spa feature
    this.ee.on('interactionDone', (interaction, wasSaved) => {
      if (!this.underSpaEvents[interaction.id]) return

      if (!wasSaved) { // if the ixn was saved, then its ajax reqs are part of the payload whereas if it was discarded, it should still be harvested in the ajax feature itself
        this.underSpaEvents[interaction.id].forEach((item) => this.events.add(item))
      }
      delete this.underSpaEvents[interaction.id]
    })
    // --- ^
    // --- v Used by new soft nav
    registerHandler('returnAjax', event => this.events.add(event), this.featureName, this.ee)
    // --- ^
    registerHandler('xhr', function () { // the EE-drain system not only switches "this" but also passes a new EventContext with info. Should consider platform refactor to another system which passes a mutable context around separately and predictably to avoid problems like this.
      classThis.storeXhr(...arguments, this) // this switches the context back to the class instance while passing the NR context as an argument -- see "ctx" in storeXhr
    }, this.featureName, this.ee)

    this.waitForFlags(([])).then(() => this.drain())
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
    const shouldOmitAjaxMetrics = this.agentRef.init.feature_flags?.includes('ajax_metrics_deny_list')
    const jserrorsInUse = Boolean(this.agentRef.features?.[FEATURE_NAMES.jserrors])

    // Report ajax timeslice metric (to be harvested by jserrors feature, but only if it's running).
    if (jserrorsInUse && (shouldCollect || !shouldOmitAjaxMetrics)) {
      this.agentRef.sharedAggregator.add(['xhr', hash, params, metrics])
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
      callbackDuration: metrics.cbTime
    }

    if (ctx.dt) {
      event.spanId = ctx.dt.spanId
      event.traceId = ctx.dt.traceId
      event.spanTimestamp = Math.floor(
        this.agentRef.runtime.timeKeeper.correctAbsoluteTimestamp(ctx.dt.timestamp)
      )
    }

    // parsed from the AJAX body, looking for operationName param & parsing query for operationType
    event.gql = params.gql = parseGQL({
      body: ctx.body,
      query: ctx.parsedOrigin?.search
    })
    if (event.gql) this.reportSupportabilityMetric('Ajax/Events/GraphQL/Bytes-Added', stringify(event.gql).length)

    const softNavInUse = Boolean(this.agentRef.features?.[FEATURE_NAMES.softNav])
    if (softNavInUse) { // For newer soft nav (when running), pass the event to it for evaluation -- either part of an interaction or is given back
      handle('ajax', [event], undefined, FEATURE_NAMES.softNav, this.ee)
    } else if (ctx.spaNode) { // For old spa (when running), if the ajax happened inside an interaction, hold it until the interaction finishes
      const interactionId = ctx.spaNode.interaction.id
      this.underSpaEvents[interactionId] ??= []
      this.underSpaEvents[interactionId].push(event)
    } else {
      this.events.add(event)
    }
  }

  serializer (eventBuffer) {
    if (!eventBuffer.length) return
    const addString = getAddStringContext(this.agentIdentifier)
    let payload = 'bel.7;'

    for (let i = 0; i < eventBuffer.length; i++) {
      const event = eventBuffer[i]
      const fields = [
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
        nullable(event.spanId, addString, true) + // guid
        nullable(event.traceId, addString, true) + // traceId
        nullable(event.spanTimestamp, numeric, false) // timestamp
      ]

      let insert = '2,'

      // Since configuration objects (like info) are created new each time they are set, we have to grab the current pointer to the attr object here.
      const jsAttributes = this.agentRef.info.jsAttributes

      // add custom attributes
      // gql decorators are added as custom attributes to alleviate need for new BEL schema
      const attrParts = addCustomAttributes({ ...(jsAttributes || {}), ...(event.gql || {}) }, addString)
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
