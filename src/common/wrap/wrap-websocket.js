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

  class WrappedWebSocket extends WebSocket {
    static name = 'WebSocket'

    constructor (...args) {
      super(...args)
      const socketId = generateRandomHexString(6)
      this.report = reporter(socketId)
      this.report('new')

      const events = ['message', 'error', 'open', 'close']
      /** add event listeners */
      events.forEach(evt => {
        this.addEventListener(evt, function (e) {
          this.report(ADD_EVENT_LISTENER_TAG, { eventType: evt, event: e })
        })
      })
    }

    send (...args) {
      this.report('send', ...args)
      try {
        return super.send(...args)
      } catch (err) {
        this.report('send-err', ...args)
        throw err
      }
    }
  }

  globalScope.WebSocket = WrappedWebSocket
  return sharedEE
}
