import { dataSize } from '../../../common/util/data-size'
import { toTitleCase } from '../../../common/util/text'
import { ADD_EVENT_LISTENER_TAG } from '../../../common/wrap/wrap-websocket'

/**
 * A SM handler for web socket events, which converts them to a shape suitable for SMs and reports them.
 * @param {Function} reporter a function that reports data as a supportability metric
 * @param {string} tag the unique tag to assign to the sm
 * @param {number} timestamp ms from page origin
 * @param {number} timeSinceInit ms from class init
 * @param {boolean} isLoaded whether the even was observed before the page load event
 * @param {string} socketId a unique id assigned to the observed socket
 * @param {*} data the data reported alongside the socket event
 */
export function handleWebsocketEvents (reporter, tag, timestamp, timeSinceInit, isLoaded, socketId, data) {
  // socketId is unused in the SMs
  const useDataType = tag === ADD_EVENT_LISTENER_TAG
  let metricTag = toTitleCase(useDataType ? data.eventType : tag)
  if (metricTag === 'Close') {
    if (data?.event.code === 1000 || data?.event.wasClean) metricTag += '-Clean'
    else metricTag += '-Dirty'
  }
  const bytes = (metricTag === 'Message' && dataSize(data?.event?.data)) || (metricTag === 'Send' && dataSize(data))
  reporter(buildSMTag(metricTag, 'Ms'), timestamp)
  reporter(buildSMTag(metricTag, 'MsSinceClassInit'), timeSinceInit)
  if (bytes) reporter(buildSMTag(metricTag, 'Bytes'), bytes)
}

function buildSMTag (tag, category) {
  return 'WebSocket/' + tag + '/' + category
}
