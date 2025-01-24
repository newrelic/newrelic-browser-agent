/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../constants/runtime'
import { now } from '../timing/now'
import { checkState } from '../window/load'
import { generateRandomHexString } from '../ids/unique-id'
import { gosNREUMOriginals } from '../window/nreum'

export const WEBSOCKET_TAG = 'websocket-'
export const ADD_EVENT_LISTENER_TAG = 'addEventListener'

const wrapped = {}

export function wrapWebSocket (sharedEE) {
  if (wrapped[sharedEE.debugId]++) return sharedEE
  const originals = gosNREUMOriginals().o
  if (!originals.WS) return sharedEE

  function reporter (socketId) {
    const createdAt = now()
    return function (message, ...data) {
      const timestamp = data[0]?.timeStamp || now()
      const isLoaded = checkState()
      sharedEE.emit(WEBSOCKET_TAG + message, [timestamp, timestamp - createdAt, isLoaded, socketId, ...data])
    }
  }

  Object.defineProperty(WrappedWebSocket, 'name', {
    value: 'WebSocket'
  })

  function WrappedWebSocket () {
    const ws = new originals.WS(...arguments)
    const socketId = generateRandomHexString(6)
    const report = reporter(socketId)
    report('new')

    const events = ['message', 'error', 'open', 'close']
    /** add event listeners */
    events.forEach(evt => {
      ws.addEventListener(evt, function (e) {
        report(ADD_EVENT_LISTENER_TAG, { eventType: evt, event: e })
      })
    })

    /** could also observe the on-events for runtime processing, but not implemented yet */

    /** observe the static method send, but noteably not close, as that is currently observed with the event listener */
    ;['send'].forEach(wrapStaticProperty)

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
