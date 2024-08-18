import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { getInfo } from '../../../common/config/config'
import { MAX_PAYLOAD_SIZE } from '../../../common/constants/agent-constants'

export default class Chunk {
  constructor (events, aggregateInstance) {
    this.addString = getAddStringContext(aggregateInstance.agentIdentifier) // pass agentIdentifier here
    this.events = events
    this.payload = 'bel.7;'

    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      const fields = [
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

      let insert = '2,'

      // Since configuration objects (like info) are created new each time they are set, we have to grab the current pointer to the attr object here.
      const jsAttributes = getInfo(aggregateInstance.agentIdentifier).jsAttributes

      // add custom attributes
      // gql decorators are added as custom attributes to alleviate need for new BEL schema
      const attrParts = addCustomAttributes({ ...(jsAttributes || {}), ...(event.gql || {}) }, this.addString)
      fields.unshift(numeric(attrParts.length))

      insert += fields.join(',')
      if (attrParts && attrParts.length > 0) {
        insert += ';' + attrParts.join(';')
      }
      if ((i + 1) < events.length) insert += ';'

      this.payload += insert
    }

    this.tooBig = this.payload.length * 2 > MAX_PAYLOAD_SIZE
  }
}
