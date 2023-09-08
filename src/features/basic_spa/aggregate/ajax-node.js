import { getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { TYPE_IDS } from '../constants'
import { BelNode } from './bel-node'

export class AjaxNode extends BelNode {
  #method
  #status
  #domain
  #path
  #txSize // request body size
  #rxSize // response body size
  #requestedWith // isFetch (1) | isJSONP (2) | XMLHttpRequest ('')
  #spanId
  #traceId
  #spanTimestamp

  constructor (agentIdentifier, ajaxEvent, firstTimestamp) {
    super(agentIdentifier)
    this.belType = TYPE_IDS.AJAX
    this.#method = ajaxEvent.method
    this.#status = ajaxEvent.status
    this.#domain = ajaxEvent.domain
    this.#path = ajaxEvent.path
    this.#txSize = ajaxEvent.requestSize
    this.#rxSize = ajaxEvent.responseSize
    this.#requestedWith = ajaxEvent.type === 'fetch' ? 1 : ajaxEvent.type === 'jsonp' ? 2 : '' // does this actually work?
    this.#spanId = ajaxEvent.spanId
    this.#traceId = ajaxEvent.traceId
    this.#spanTimestamp = ajaxEvent.spanTimestamp

    this.startTimestamp = ajaxEvent.startTime - firstTimestamp
    this.start = ajaxEvent.startTime
    this.end = ajaxEvent.endTime
  }

  get method () { return getAddStringContext(this.agentIdentifier)(this.#method) }
  get status () { return numeric(this.#status) }
  get domain () { return getAddStringContext(this.agentIdentifier)(this.#domain) }
  get path () { return getAddStringContext(this.agentIdentifier)(this.#path) }
  get txSize () { return numeric(this.#txSize) }
  get rxSize () { return numeric(this.#rxSize) }
  get requestedWith () { return this.#requestedWith }
  get spanId () { return nullable(this.#spanId, getAddStringContext(this.agentIdentifier), true) }
  get traceId () { return nullable(this.#traceId, getAddStringContext(this.agentIdentifier), true) }
  get spanTimestamp () { return nullable(this.#spanTimestamp, numeric, false) }

  serialize () {
    const nodeList = []
    const fields = [
      this.belType,
      this.childCount,
      this.startTimestamp,
      // this.end,
      this.calculatedEnd,
      this.callbackEnd,
      // this.calculatedCallbackEnd,
      this.callbackDuration,
      this.method,
      this.status,
      this.domain,
      this.path,
      this.txSize,
      this.rxSize,
      this.requestedWith,
      this.nodeId,
      this.spanId,
      this.traceId,
      this.spanTimestamp
    ]

    nodeList.push(fields)

    return nodeList.join(';')
  }
}
