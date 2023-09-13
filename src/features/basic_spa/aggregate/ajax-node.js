import { getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { TYPE_IDS } from '../constants'
import { BelNode } from './bel-node'

export class AjaxNode extends BelNode {
  method
  status
  domain
  path
  txSize // request body size
  rxSize // response body size
  requestedWith // isFetch (1) | isJSONP (2) | XMLHttpRequest ('')
  spanId
  traceId
  spanTimestamp

  constructor (agentIdentifier, ajaxEvent) {
    super(agentIdentifier)
    this.belType = TYPE_IDS.AJAX
    this.method = ajaxEvent.method
    this.status = ajaxEvent.status
    this.domain = ajaxEvent.domain
    this.path = ajaxEvent.path
    this.txSize = ajaxEvent.requestSize
    this.rxSize = ajaxEvent.responseSize
    this.requestedWith = ajaxEvent.type === 'fetch' ? 1 : ajaxEvent.type === 'jsonp' ? 2 : '' // does this actually work?
    this.spanId = ajaxEvent.spanId
    this.traceId = ajaxEvent.traceId
    this.spanTimestamp = ajaxEvent.spanTimestamp

    this.start = ajaxEvent.startTime
    this.end = ajaxEvent.endTime
    this.callbackDuration = ajaxEvent.callbackDuration
    this.callbackEnd = this.callbackDuration
  }

  serialize (startTimestamp) {
    const addString = getAddStringContext(this.agentIdentifier)
    const nodeList = []
    const fields = [
      numeric(this.belType),
      this.children.length,
      numeric(this.start - startTimestamp), // start relative to first seen (parent interaction)
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
      nullable(this.spanId, addString, true),
      nullable(this.traceId, addString, true),
      nullable(this.spanTimestamp, numeric, true)
    ]

    nodeList.push(fields)

    return nodeList.join(';')
  }
}
