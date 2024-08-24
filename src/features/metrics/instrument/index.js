import { handle } from '../../../common/event-emitter/handle'
import { dataSize } from '../../../common/util/data-size'
import { toTitleCase } from '../../../common/util/text'
import { ADD_EVENT_LISTENER_TAG, WEBSOCKET_TAG, wrapWebSocket } from '../../../common/wrap/wrap-websocket'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, SUPPORTABILITY_METRIC_CHANNEL } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    wrapWebSocket(this.ee)

    const handleWebsocketEvents = (suffix) => {
      this.ee.on(WEBSOCKET_TAG + suffix, (timestamp, timeSinceInit, data) => {
        const metricTag = toTitleCase(suffix === ADD_EVENT_LISTENER_TAG ? data.eventType : suffix)
        const bytes = (metricTag === 'Message' && dataSize(data?.event?.data)) || (metricTag === 'Send' && dataSize(data))
        handle(SUPPORTABILITY_METRIC_CHANNEL, [`WebSocket/${metricTag}/Ms`, timestamp], undefined, this.featureName, this.ee)
        handle(SUPPORTABILITY_METRIC_CHANNEL, [`WebSocket/${metricTag}/MsSinceClassInit`, timeSinceInit], undefined, this.featureName, this.ee)
        if (bytes) handle(SUPPORTABILITY_METRIC_CHANNEL, [`WebSocket/${metricTag}/Bytes`, bytes], undefined, this.featureName, this.ee)
      })
    }
    ;['new', 'send', 'close', ADD_EVENT_LISTENER_TAG].forEach(handleWebsocketEvents)

    this.importAggregator()
  }
}
