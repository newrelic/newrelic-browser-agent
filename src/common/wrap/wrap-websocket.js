/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../constants/runtime'
import { generateRandomHexString } from '../ids/unique-id'
import { now } from '../timing/now'
import { cleanURL } from '../url/clean-url'
import { gosNREUMOriginals } from '../window/nreum'
import { subscribeToPageUnload } from '../window/page-visibility'

const wrapped = {}
const openWebSockets = new Set() // track all instances to close out metrics on page unload

export function wrapWebSocket (sharedEE) {
  const originals = gosNREUMOriginals().o
  if (!originals.WS) return sharedEE

  const wsEE = sharedEE.get('websockets')
  if (wrapped[wsEE.debugId]++) return wsEE
  wrapped[wsEE.debugId] = 1 // otherwise, first feature to wrap events

  // This handles page navigation scenarios where the browser closes WebSockets after pagehide fires
  subscribeToPageUnload(() => {
    const unloadTime = now()
    openWebSockets.forEach(ws => {
      ws.nrData.closedAt = unloadTime
      ws.nrData.closeCode = 1001 // Going Away - standard code for page navigation
      ws.nrData.closeReason = 'Page navigating away'
      ws.nrData.closeWasClean = false
      if (ws.nrData.openedAt) {
        ws.nrData.connectedDuration = unloadTime - ws.nrData.openedAt
      }

      wsEE.emit('ws', [ws.nrData], ws)
    })
  })

  class WrappedWebSocket extends WebSocket {
    static name = 'WebSocket'
    static toString () { // fake native WebSocket when static class is stringified
      return 'function WebSocket() { [native code] }'
    }

    toString () { // fake [object WebSocket] when instance is stringified
      return '[object WebSocket]'
    }

    get [Symbol.toStringTag] () { // fake [object WebSocket] when Object.prototype.toString.call is used on instance
      return WrappedWebSocket.name
    }

    // Private method to tag send, close, and event listener errors with WebSocket ID for JSErrors feature
    #tagError (error) {
      ;(error.__newrelic ??= {}).socketId = this.nrData.socketId
      this.nrData.hasErrors ??= true
    }

    constructor (...args) {
      super(...args)
      /** @type {WebSocketData} */
      this.nrData = new WebSocketData(args[0], args[1])

      this.addEventListener('open', () => {
        this.nrData.openedAt = now()
        ;['protocol', 'extensions', 'binaryType'].forEach(prop => {
          this.nrData[prop] = this[prop]
        })
        openWebSockets.add(this)
      })

      this.addEventListener('message', (event) => {
        const { type, size } = getDataInfo(event.data)
        this.nrData.messageOrigin ??= cleanURL(event.origin) // the origin of messages thru WS lifetime cannot be changed, so set once is sufficient
        this.nrData.messageCount = (this.nrData.messageCount ?? 0) + 1
        this.nrData.messageBytes = (this.nrData.messageBytes ?? 0) + size
        this.nrData.messageBytesMin = Math.min(this.nrData.messageBytesMin ?? Infinity, size)
        this.nrData.messageBytesMax = Math.max(this.nrData.messageBytesMax ?? 0, size)
        if (!(this.nrData.messageTypes ?? '').includes(type)) {
          this.nrData.messageTypes = this.nrData.messageTypes ? `${this.nrData.messageTypes},${type}` : type
        }
      })

      this.addEventListener('close', (event) => {
        this.nrData.closedAt = now()
        this.nrData.closeCode = event.code
        this.nrData.closeReason = event.reason
        this.nrData.closeWasClean = event.wasClean
        this.nrData.connectedDuration = this.nrData.closedAt - this.nrData.openedAt

        openWebSockets.delete(this) // remove from tracking set since it's now closed
        wsEE.emit('ws', [this.nrData], this)
      })
    }

    addEventListener (type, listener, ...rest) {
      const wsInstance = this
      const wrappedListener = typeof listener === 'function'
        ? function (...args) {
          try {
            return listener.apply(this, args)
          } catch (error) {
            wsInstance.#tagError(error)
            throw error
          }
        }
        : listener?.handleEvent
          ? { // case for listener === object with handleEvent
              handleEvent: function (...args) {
                try {
                  return listener.handleEvent.apply(listener, args)
                } catch (error) {
                  wsInstance.#tagError(error)
                  throw error
                }
              }
            }
          : listener // case for listener === null
      return super.addEventListener(type, wrappedListener, ...rest)
    }

    send (data) {
      // Only track metrics if the connection is OPEN; data sent in CONNECTING state throws, and data sent in CLOSING/CLOSED states is silently discarded
      if (this.readyState === WebSocket.OPEN) {
        const { type, size } = getDataInfo(data)
        this.nrData.sendCount = (this.nrData.sendCount ?? 0) + 1
        this.nrData.sendBytes = (this.nrData.sendBytes ?? 0) + size
        this.nrData.sendBytesMin = Math.min(this.nrData.sendBytesMin ?? Infinity, size)
        this.nrData.sendBytesMax = Math.max(this.nrData.sendBytesMax ?? 0, size)
        if (!(this.nrData.sendTypes ?? '').includes(type)) {
          this.nrData.sendTypes = this.nrData.sendTypes ? `${this.nrData.sendTypes},${type}` : type
        }
      }
      try {
        return super.send(data)
      } catch (error) {
        this.#tagError(error)
        throw error
      }
    }

    close (...args) {
      try {
        super.close(...args)
      } catch (error) {
        this.#tagError(error)
        throw error
      }
    }
  }

  globalScope.WebSocket = WrappedWebSocket
  return wsEE
}

/**
 * Returns the data type and size of the WebSocket send data
 * @param {*} data - The data being sent
 * @returns {{ type: string, size: number }} - The type name and size in bytes
 */
function getDataInfo (data) {
  if (typeof data === 'string') {
    return {
      type: 'string',
      size: new TextEncoder().encode(data).length // efficient way to calculate the # of UTF-8 bytes that WS sends (cannot use string length)
    }
  }
  if (data instanceof ArrayBuffer) {
    return { type: 'ArrayBuffer', size: data.byteLength }
  }
  if (data instanceof Blob) {
    return { type: 'Blob', size: data.size }
  }
  if (data instanceof DataView) {
    return { type: 'DataView', size: data.byteLength }
  }
  if (ArrayBuffer.isView(data)) {
    return { type: 'TypedArray', size: data.byteLength }
  }
  return { type: 'unknown', size: 0 }
}

/**
 * WebSocket instrumentation data model
 */
class WebSocketData {
  /**
   * @param {string} requestedUrl - The URL passed to WebSocket constructor
   * @param {string|string[]} [requestedProtocols] - The protocols passed to WebSocket constructor
   */
  constructor (requestedUrl, requestedProtocols) {
    /** @type {number} Timestamp when the WebSocket was constructed (relative time); will be time corrected later when timeKeeper is available */
    this.timestamp = now()

    /** @type {string} Most current URL when WebSocket was created; relevant for SPA */
    this.currentUrl = cleanURL(window.location.href)

    /*
     * pageUrl will be set by addEvent later; unlike timestamp and currentUrl, it's not sensitive to *when* it is set.
     * It should not be explicitly defined here as it will overwrite the default provided by Generic Events later.
    */

    /** @type {string} Unique identifier for this WebSocket connection */
    this.socketId = generateRandomHexString(8)

    /** @type {string} The URL requested for the WebSocket connection */
    this.requestedUrl = cleanURL(requestedUrl)

    /** @type {string} Comma-separated list of requested protocols */
    this.requestedProtocols = Array.isArray(requestedProtocols) ? requestedProtocols.join(',') : (requestedProtocols || '')

    // Properties set when connection opens
    /** @type {number} [openedAt] Timestamp when connection opened */
    this.openedAt = undefined

    /** @type {string} [protocol] The sub-protocol selected by the server */
    this.protocol = undefined

    /** @type {string} [extensions] The extensions selected by the server */
    this.extensions = undefined

    /** @type {string} [binaryType] The binary type ('blob' or 'arraybuffer') */
    this.binaryType = undefined

    // Message received metrics
    /** @type {string} [messageOrigin] Origin of messages (set once) */
    this.messageOrigin = undefined

    /** @type {number} [messageCount] Total number of messages received */
    this.messageCount = undefined

    /** @type {number} [messageBytes] Total bytes received */
    this.messageBytes = undefined

    /** @type {number} [messageBytesMin] Minimum message size received */
    this.messageBytesMin = undefined

    /** @type {number} [messageBytesMax] Maximum message size received */
    this.messageBytesMax = undefined

    /** @type {string} [messageTypes] Comma-separated list of message types received */
    this.messageTypes = undefined

    // Send metrics
    /** @type {number} [sendCount] Total number of messages sent */
    this.sendCount = undefined

    /** @type {number} [sendBytes] Total bytes sent */
    this.sendBytes = undefined

    /** @type {number} [sendBytesMin] Minimum message size sent */
    this.sendBytesMin = undefined

    /** @type {number} [sendBytesMax] Maximum message size sent */
    this.sendBytesMax = undefined

    /** @type {string} [sendTypes] Comma-separated list of message types sent */
    this.sendTypes = undefined

    // Close metrics
    /** @type {number} [closedAt] Timestamp when connection closed */
    this.closedAt = undefined

    /** @type {number} [closeCode] WebSocket close code */
    this.closeCode = undefined

    /** @type {string} [closeReason] WebSocket close reason */
    this.closeReason = undefined

    /** @type {boolean} [closeWasClean] Whether the connection closed cleanly */
    this.closeWasClean = undefined

    /** @type {number} [connectedDuration] Duration of the connection in milliseconds */
    this.connectedDuration = undefined

    // Error tracking
    /** @type {boolean} [hasErrors] Whether any errors occurred */
    this.hasErrors = undefined
  }
}
