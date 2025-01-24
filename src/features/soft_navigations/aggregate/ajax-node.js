/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { addCustomAttributes, getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { NODE_TYPE } from '../constants'
import { BelNode } from './bel-node'

export class AjaxNode extends BelNode {
  constructor (agentIdentifier, ajaxEvent) {
    super(agentIdentifier)
    this.belType = NODE_TYPE.AJAX
    this.method = ajaxEvent.method
    this.status = ajaxEvent.status
    this.domain = ajaxEvent.domain
    this.path = ajaxEvent.path
    this.txSize = ajaxEvent.requestSize
    this.rxSize = ajaxEvent.responseSize
    this.requestedWith = ajaxEvent.type === 'fetch' ? 1 : '' // 'xhr' and 'beacon' types get the empty string
    this.spanId = ajaxEvent.spanId
    this.traceId = ajaxEvent.traceId
    this.spanTimestamp = ajaxEvent.spanTimestamp
    this.gql = ajaxEvent.gql

    this.start = ajaxEvent.startTime // 5000 --- 5500 --> 10500
    this.end = ajaxEvent.endTime
  }

  serialize (parentStartTimestamp) {
    const addString = getAddStringContext(this.agentIdentifier)
    const nodeList = []

    // IMPORTANT: The order in which addString is called matters and correlates to the order in which string shows up in the harvest payload. Do not re-order the following code.
    const fields = [
      numeric(this.belType),
      0, // this will be overwritten below with number of attached nodes
      numeric(this.start - parentStartTimestamp), // start relative to parent start (if part of first node in payload) or first parent start
      numeric(this.end - this.start), // end is relative to start
      numeric(this.callbackEnd),
      numeric(this.callbackDuration),
      addString(this.method),
      numeric(this.status),
      addString(this.domain),
      addString(this.path),
      numeric(this.txSize),
      numeric(this.rxSize),
      this.requestedWith,
      addString(this.nodeId),
      nullable(this.spanId, addString, true) + nullable(this.traceId, addString, true) + nullable(this.spanTimestamp, numeric)
    ]
    let allAttachedNodes = []
    if (typeof this.gql === 'object') allAttachedNodes = addCustomAttributes(this.gql, addString)
    this.children.forEach(node => allAttachedNodes.push(node.serialize())) // no children is expected under ajax nodes at this time

    fields[1] = numeric(allAttachedNodes.length)
    nodeList.push(fields)
    if (allAttachedNodes.length) nodeList.push(allAttachedNodes.join(';'))

    return nodeList.join(';')
  }
}
