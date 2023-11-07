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

    this.start = ajaxEvent.startTime
    this.end = ajaxEvent.endTime
  }

  serialize (parentStartTimestamp) {
    const addString = getAddStringContext(this.agentIdentifier)
    const nodeList = []
    let allAttachedNodes = []

    if (typeof this.gql === 'object') allAttachedNodes = addCustomAttributes(this.gql, addString)
    this.children.forEach(node => allAttachedNodes.push(node.serialize(this.start)))

    const fields = [
      numeric(this.belType),
      allAttachedNodes.length,
      numeric(this.start - parentStartTimestamp), // start relative to first seen (parent interaction)
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
      nullable(this.spanId, addString),
      nullable(this.traceId, addString),
      nullable(this.spanTimestamp, numeric)
    ]

    nodeList.push(fields)
    if (allAttachedNodes.length) nodeList.push(allAttachedNodes.join(';'))

    return nodeList.join(';')
  }
}
