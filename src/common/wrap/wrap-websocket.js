import { globalScope } from '../constants/runtime'
import { originals } from '../config/state/originals'
import { now } from '../timing/now'
import { checkState } from '../window/load'

export const WEBSOCKET_TAG = 'websocket-'
export const ADD_EVENT_LISTENER_TAG = 'addEventListener'

const wrapped = {}

export function wrapWebSocket (sharedEE) {
  if (wrapped[sharedEE.debugId]++) return sharedEE
  if (!originals.WS) return sharedEE

  function reporter () {
    const createdAt = now()
    return function (message, ...data) {
      const timestamp = data[0]?.timeStamp || now()
      const isLoaded = checkState()
      sharedEE.emit(WEBSOCKET_TAG + message, [timestamp, timestamp - createdAt, isLoaded, ...data])
    }
  }

  Object.defineProperty(WrappedWebSocket, 'name', {
    value: 'WebSocket'
  })

  function WrappedWebSocket () {
    const ws = new originals.WS(...arguments)
    const report = reporter()
    report('new')

    const events = ['message', 'error', 'open', 'close'] // could also watch the "close" AEL if we wanted to, but we are already watching the static method
    /** add event listeners */
    events.forEach(evt => {
      ws.addEventListener(evt, function (e) {
        report(ADD_EVENT_LISTENER_TAG, { eventType: evt, event: e })
      })
    })

    /** could also observe the on-events for runtime processing, but not implemented yet */

    /** observe the static methods */
    ;['send', 'close'].forEach(wrapStaticProperty)

    function wrapStaticProperty (prop) {
      const originalProp = ws[prop]
      if (originalProp) {
        Object.defineProperty(proxiedProp, 'name', {
          value: prop
        })
        function proxiedProp () {
          report(prop, ...arguments)
          try {
            return originalProp.apply(this, arguments)
          } catch (err) {
            report(prop + '-err', ...arguments)
            // rethrow error so we don't effect execution by observing.
            throw err
          }
        }
        ws[prop] = proxiedProp
      }
    }

    return ws
  }
  globalScope.WebSocket = WrappedWebSocket
  return sharedEE
}
