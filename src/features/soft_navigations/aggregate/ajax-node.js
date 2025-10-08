/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { addCustomAttributes, getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { NODE_TYPE } from '../constants'
import { BelNode } from './bel-node'

export class AjaxNode extends BelNode {
  constructor (ajaxEvent, ajaxContext) {
    super()
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
    this.gql = ajaxEvent.gql || {}

    this.start = ajaxEvent.startTime
    this.end = ajaxEvent.endTime
    if (ajaxContext?.latestLongtaskEnd) {
      this.callbackEnd = Math.max(ajaxContext.latestLongtaskEnd, this.end) // typically lt end if non-zero, but added clamping to end just in case
      this.callbackDuration = this.callbackEnd - this.end // callbackDuration is the time from ajax loaded to last long task observed from it
    } else this.callbackEnd = this.end // if no long task was observed, callbackEnd is the same as end
  }

  /**
   * Serializes the AjaxNode instance into bel string format for transmission.
   * @param {number} parentStartTimestamp The start timestamp of the parent interaction
   * @param {*} agentRef The reference to the agent base class
   * @param {boolean} hasReplay For simplicity, the AjaxNode will inherit the hasReplay state of its parent interaction
   * @returns
   */
  serialize (parentStartTimestamp, agentRef, hasReplay) {
    const addString = getAddStringContext(agentRef.runtime.obfuscator)
    const nodeList = []

    // IMPORTANT: The order in which addString is called matters and correlates to the order in which string shows up in the harvest payload. Do not re-order the following code.
    const fields = [
      numeric(this.belType),
      0, // this will be overwritten below with number of attached nodes
      numeric(this.start - parentStartTimestamp), // start relative to parent start (if part of first node in payload) or first parent start
      numeric(this.end - this.start), // end is relative to start
      numeric(this.callbackEnd - this.end), // callbackEnd is relative to end
      numeric(this.callbackDuration), // not relative
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
    let allAttachedNodes = addCustomAttributes({ ...(hasReplay && { hasReplay }), ...this.gql }, addString)
    this.children.forEach(node => allAttachedNodes.push(node.serialize())) // no children is expected under ajax nodes at this time

    fields[1] = numeric(allAttachedNodes.length)
    nodeList.push(fields)
    if (allAttachedNodes.length) nodeList.push(allAttachedNodes.join(';'))

    return nodeList.join(';')
  }
}
