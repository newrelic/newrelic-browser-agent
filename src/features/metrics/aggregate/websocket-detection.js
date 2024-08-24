import { dataSize } from '../../../common/util/data-size'
import { toTitleCase } from '../../../common/util/text'
import { ADD_EVENT_LISTENER_TAG } from '../../../common/wrap/wrap-websocket'

export function handleWebsocketEvents (reporter, tag, timestamp, timeSinceInit, isLoaded, data) {
  const metricTag = toTitleCase(tag === ADD_EVENT_LISTENER_TAG ? data.eventType : tag)
  const bytes = (metricTag === 'Message' && dataSize(data?.event?.data)) || (metricTag === 'Send' && dataSize(data))
  reporter(buildSMTag(metricTag, 'Ms', isLoaded), timestamp)
  reporter(buildSMTag(metricTag, 'MsSinceClassInit', isLoaded), timeSinceInit)
  if (bytes) reporter(buildSMTag(metricTag, 'Bytes', isLoaded), bytes)
}

function buildSMTag (tag, category, isLoaded) {
  return 'WebSocket/' + tag + '/' + (isLoaded ? 'PostLoad' : 'PreLoad') + '/' + category
}
