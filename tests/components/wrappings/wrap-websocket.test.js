import { ee } from '../../../src/common/event-emitter/contextual-ee'
import * as nreumModule from '../../../src/common/window/nreum'

const origWebSocket = WebSocket
let ws
let agentEE
describe('wrap-websocket', () => {
  beforeAll(() => {
    global.TextEncoder = global.TextEncoder || class TextEncoder { // polyfill for TextEncoder used in WrappedWebSocket send()
      encode (str) {
        return new Uint8Array(str.split('').map(c => c.charCodeAt(0)))
      }
    }
  })
  beforeEach(async () => {
    global.WebSocket = origWebSocket
    jest.spyOn(nreumModule, 'gosNREUMOriginals').mockImplementation(() => ({ o: { WS: origWebSocket } }))
    jest.spyOn(global.WebSocket.prototype, 'send').mockReturnValue(() => {})
    const { wrapWebSocket } = await import('../../../src/common/wrap/wrap-websocket')
    agentEE = ee.get(Math.random().toString(36)) // creating a new child EE under unique id for each test ensures wrapping isn't blocked
    wrapWebSocket(agentEE, 'someFeature')
    ws = new window.WebSocket('ws://foo.com/websocket')
  })
  afterEach(() => {
    jest.resetModules() // reset module cache to ensure fresh wrap-websocket import
    jest.clearAllMocks()
  })

  it('should mutate global to match same properties as original', () => {
    expect(WebSocket.name).toEqual('WebSocket')
    expect(String(WebSocket)).toContain('[native code]')
    expect(String(ws)).toEqual('[object WebSocket]')
    expect(Object.prototype.toString.call(ws)).toEqual('[object WebSocket]')
    expect(typeof ws.send).toEqual('function')
    expect(typeof ws.close).toEqual('function')
    expect(ws.send.name).toEqual('send')
    expect(ws.close.name).toEqual('close')
    expect(typeof ws.addEventListener).toEqual('function')

    expect(ws.binaryType).toEqual('blob')
    expect(ws.bufferedAmount).toEqual(0)
    expect(ws.extensions).toEqual('')
    expect(ws.onclose).toEqual(null)
    expect(ws.onerror).toEqual(null)
    expect(ws.onmessage).toEqual(null)
    expect(ws.onopen).toEqual(null)
    expect(ws.protocol).toEqual('')
    expect(ws.readyState).toEqual(0)
    expect(ws.url).toEqual('ws://foo.com/websocket')

    expect(WebSocket.length).not.toBeUndefined()
    expect(WebSocket.CONNECTING).toEqual(0)
    expect(WebSocket.OPEN).toEqual(1)
    expect(WebSocket.CLOSING).toEqual(2)
    expect(WebSocket.CLOSED).toEqual(3)
  })

  it('should not wrap if no WS global', async () => {
    expect(nreumModule.gosNREUMOriginals().o.WS).toBe(origWebSocket) // from beforeEach
    global.WebSocket = undefined
    jest.spyOn(nreumModule, 'gosNREUMOriginals').mockImplementation(() => ({ o: { WS: undefined } }))
    expect(nreumModule.gosNREUMOriginals().o.WS).toBeUndefined()
    const { wrapWebSocket } = await import('../../../src/common/wrap/wrap-websocket')
    wrapWebSocket(ee.get(Math.random().toString(36)))
    expect(global.WebSocket).toBeUndefined()
  })

  it('cleans URLs by removing query params and hash routes', () => {
    const testCases = [
      {
        input: 'ws://example.com/socket?token=abc123&session=xyz',
        expected: 'ws://example.com/socket'
      },
      {
        input: 'wss://localhost:3000/ws?id=12345',
        expected: 'wss://localhost:3000/ws'
      },
      {
        input: 'ws://example.com/path/to/socket?a=1&b=2',
        expected: 'ws://example.com/path/to/socket'
      }
    ]

    testCases.forEach(({ input, expected }) => {
      const testWs = new window.WebSocket(input)
      expect(testWs.nrData.requestedUrl).toBe(expected)
    })
  })

  it('cleans currentUrl by removing query params and hash routes', () => {
    const originalHref = window.location.href

    const testCases = [
      {
        pageUrl: 'https://example.com/page?user=john&token=secret123',
        expectedCurrentUrl: 'https://example.com/page'
      },
      {
        pageUrl: 'https://example.com/app#section1',
        expectedCurrentUrl: 'https://example.com/app'
      },
      {
        pageUrl: 'https://example.com/dashboard?id=456&filter=active#top',
        expectedCurrentUrl: 'https://example.com/dashboard'
      },
      {
        pageUrl: 'https://example.com/simple',
        expectedCurrentUrl: 'https://example.com/simple'
      }
    ]

    testCases.forEach(({ pageUrl, expectedCurrentUrl }) => {
      // Mock window.location.href
      delete window.location
      window.location = { href: pageUrl }

      const testWs = new window.WebSocket('ws://example.com/socket')
      expect(testWs.nrData.currentUrl).toBe(expectedCurrentUrl)
    })

    // Restore original href
    delete window.location
    window.location = { href: originalHref }
  })

  it('cleans messageOrigin by removing query params and hash routes', () => {
    const testCases = [
      {
        origin: 'ws://example.com:8080?token=secret',
        expected: 'ws://example.com:8080'
      },
      {
        origin: 'wss://api.example.com#section',
        expected: 'wss://api.example.com'
      },
      {
        origin: 'ws://localhost:3000?id=123&key=abc#top',
        expected: 'ws://localhost:3000'
      },
      {
        origin: 'ws://clean.example.com',
        expected: 'ws://clean.example.com'
      }
    ]

    testCases.forEach(({ origin, expected }) => {
      const testWs = new window.WebSocket('ws://example.com/socket')
      testWs.dispatchEvent(new MessageEvent('message', { data: 'test', origin }))
      expect(testWs.nrData.messageOrigin).toBe(expected)
    })
  })

  it('tracks nr metadata on websocket instance through lifecycle', () => {
    expect(typeof ws.nrData).toBe('object')
    let expectNrData = {
      timestamp: expect.any(Number),
      currentUrl: expect.any(String),
      socketId: expect.any(String),
      requestedUrl: 'ws://foo.com/websocket',
      requestedProtocols: '',
      closeReason: 'unknown'
    }
    expect(ws.nrData).toEqual(expectNrData)
    expect(ws.nrData.openedAt).toBeUndefined()

    ws.dispatchEvent(new Event('open')) // mock ws opening
    expect(ws.nrData).toEqual(expectNrData = {
      ...expectNrData,
      openedAt: expect.any(Number),
      binaryType: ws.binaryType,
      extensions: ws.extensions,
      protocol: ws.protocol
    })
    expect(ws.nrData.openedAt).toBeGreaterThanOrEqual(ws.nrData.timestamp)
    expect(ws.nrData.sendCount).toBeUndefined()

    expect(origWebSocket.prototype.send).not.toHaveBeenCalled()
    ws.send('abc') // the readystate is still CONNECTING here, so wrapped send should not track and only call original send
    expect(origWebSocket.prototype.send).toHaveBeenCalledTimes(1)
    expect(ws.nrData.sendCount).toBeUndefined()

    Object.defineProperty(ws, 'readyState', { value: WebSocket.OPEN })
    ws.send('abc')
    expect(origWebSocket.prototype.send).toHaveBeenCalledTimes(2)
    expect(ws.nrData).toEqual(expectNrData = {
      ...expectNrData,
      sendCount: 1,
      sendBytes: 3,
      sendBytesMin: 3,
      sendBytesMax: 3,
      sendTypes: 'string'
    })
    expect(ws.nrData.messageCount).toBeUndefined()

    ws.dispatchEvent(new MessageEvent('message', { data: 'hello world', origin: 'ws://foo.com' }))
    expect(ws.nrData).toEqual(expectNrData = {
      ...expectNrData,
      messageOrigin: 'ws://foo.com',
      messageCount: 1,
      messageBytes: 11,
      messageBytesMin: 11,
      messageBytesMax: 11,
      messageTypes: 'string'
    })

    const emitSpy = jest.spyOn(agentEE, 'emit')
    ws.dispatchEvent(new CloseEvent('close', { code: 1000, reason: 'Normal closure', wasClean: true }))
    expect(ws.nrData).toEqual(expectNrData = {
      ...expectNrData,
      closedAt: expect.any(Number),
      closeCode: 1000,
      closeReason: 'Normal closure',
      closeWasClean: true,
      connectedDuration: expect.any(Number)
    })
    expect(ws.nrData.closedAt).toBeGreaterThanOrEqual(ws.nrData.openedAt)

    expect(emitSpy).toHaveBeenCalledWith('ws', [expectNrData], ws)
  })

  it('tracks send metrics for multiple calls with all 5 data types', () => {
    // Set WebSocket to OPEN state
    Object.defineProperty(ws, 'readyState', { value: WebSocket.OPEN })

    const stringData = 'Hello' // 5 bytes (ASCII)
    const arrayBufferData = new ArrayBuffer(20) // 20 bytes
    const blobData = new Blob(['blob'], { type: 'text/plain' }) // 4 bytes
    const typedArrayData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) // 10 bytes
    const dataViewData = new DataView(new ArrayBuffer(25)) // 25 bytes

    // Send #1: string (5 bytes)
    ws.send(stringData)
    expect(ws.nrData.sendCount).toBe(1)
    expect(ws.nrData.sendBytes).toBe(5)
    expect(ws.nrData.sendBytesMin).toBe(5)
    expect(ws.nrData.sendBytesMax).toBe(5)
    expect(ws.nrData.sendTypes).toEqual('string')

    // Send #2: ArrayBuffer (20 bytes)
    ws.send(arrayBufferData)
    expect(ws.nrData.sendCount).toBe(2)
    expect(ws.nrData.sendBytes).toBe(25)
    expect(ws.nrData.sendBytesMin).toBe(5)
    expect(ws.nrData.sendBytesMax).toBe(20)
    expect(ws.nrData.sendTypes).toEqual('string,ArrayBuffer')

    // Send #3: Blob (4 bytes)
    ws.send(blobData)
    expect(ws.nrData.sendBytes).toBe(29)
    expect(ws.nrData.sendTypes).toEqual('string,ArrayBuffer,Blob')

    // Send #4: TypedArray (10 bytes)
    ws.send(typedArrayData)
    expect(ws.nrData.sendBytes).toBe(39)
    expect(ws.nrData.sendTypes).toEqual('string,ArrayBuffer,Blob,TypedArray')

    // Send #5: DataView (25 bytes)
    ws.send(dataViewData)
    expect(ws.nrData.sendCount).toBe(5)
    expect(ws.nrData.sendBytes).toBe(64)
    expect(ws.nrData.sendBytesMin).toBe(4)
    expect(ws.nrData.sendBytesMax).toBe(25)
    expect(ws.nrData.sendTypes).toEqual('string,ArrayBuffer,Blob,TypedArray,DataView')

    // Verify sendTypes doesn't duplicate if same type is sent again
    ws.send('test')
    expect(ws.nrData.sendCount).toBe(6)
    expect(ws.nrData.sendBytes).toBe(68) // 64 + 4 bytes for 'test'
    expect(ws.nrData.sendTypes).toEqual('string,ArrayBuffer,Blob,TypedArray,DataView') // still only 5 unique types
  })

  it('attaches __newrelic attribute with socketId when send throws an error', () => {
    // Mock the original send to throw an error
    jest.spyOn(origWebSocket.prototype, 'send').mockImplementation(() => {
      throw new Error('Send failed')
    })
    Object.defineProperty(ws, 'readyState', { value: WebSocket.OPEN })

    const socketId = ws.nrData.socketId
    expect(ws.nrData.hasErrors).toBeUndefined()
    let caughtError
    try {
      ws.send('test data')
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeDefined()
    expect(caughtError.message).toBe('Send failed')
    expect(caughtError.__newrelic).toBeDefined()
    expect(caughtError.__newrelic.socketId).toBe(socketId)
    expect(ws.nrData.hasErrors).toBe(true)
  })

  it('attaches __newrelic attribute with socketId when close throws an error', () => {
    // Mock the original close to throw an error
    jest.spyOn(origWebSocket.prototype, 'close').mockImplementation(() => {
      throw new Error('Close failed')
    })

    const socketId = ws.nrData.socketId
    expect(ws.nrData.hasErrors).toBeUndefined()
    let caughtError
    try {
      ws.close()
    } catch (error) {
      caughtError = error
    }

    expect(caughtError.message).toBe('Close failed')
    expect(caughtError.__newrelic.socketId).toBe(socketId)
    expect(ws.nrData.hasErrors).toBe(true)
  })

  // Note: Error attribution for event listeners (addEventListener wrapper) cannot be tested in jest because jsdom's error handling differs from real browsers
  // -- it logs errors synchronously which causes unit test failures even when errors are properly caught and tagged.

  it('tracks message metrics for multiple calls with all 3 data types', () => {
    const stringData = 'Hello' // 5 bytes (ASCII)
    const arrayBufferData = new ArrayBuffer(20) // 20 bytes
    const blobData = new Blob(['blob'], { type: 'text/plain' }) // 4 bytes

    // Message #1: string (5 bytes)
    ws.dispatchEvent(new MessageEvent('message', { data: stringData, origin: 'ws://foo.com' }))
    expect(ws.nrData.messageOrigin).toBe('ws://foo.com')
    expect(ws.nrData.messageCount).toBe(1)
    expect(ws.nrData.messageBytes).toBe(5)
    expect(ws.nrData.messageBytesMin).toBe(5)
    expect(ws.nrData.messageBytesMax).toBe(5)
    expect(ws.nrData.messageTypes).toEqual('string')

    // Message #2: ArrayBuffer (20 bytes)
    ws.dispatchEvent(new MessageEvent('message', { data: arrayBufferData, origin: 'ws://foo.com' }))
    expect(ws.nrData.messageOrigin).toBe('ws://foo.com') // still the same
    expect(ws.nrData.messageCount).toBe(2)
    expect(ws.nrData.messageBytes).toBe(25)
    expect(ws.nrData.messageBytesMin).toBe(5)
    expect(ws.nrData.messageBytesMax).toBe(20)
    expect(ws.nrData.messageTypes).toEqual('string,ArrayBuffer')

    // Message #3: Blob (4 bytes)
    ws.dispatchEvent(new MessageEvent('message', { data: blobData, origin: 'ws://foo.com' }))
    expect(ws.nrData.messageCount).toBe(3)
    expect(ws.nrData.messageBytes).toBe(29)
    expect(ws.nrData.messageBytesMin).toBe(4)
    expect(ws.nrData.messageBytesMax).toBe(20)
    expect(ws.nrData.messageTypes).toEqual('string,ArrayBuffer,Blob')

    // Verify messageTypes doesn't duplicate if same type is received again
    ws.dispatchEvent(new MessageEvent('message', { data: 'test', origin: 'ws://foo.com' }))
    expect(ws.nrData.messageCount).toBe(4)
    expect(ws.nrData.messageBytes).toBe(33) // 29 + 4 bytes for 'test'
    expect(ws.nrData.messageTypes).toEqual('string,ArrayBuffer,Blob') // still only 3 unique types
  })

  describe('pagehide event handling', () => {
    let emitSpy

    beforeEach(() => {
      emitSpy = jest.spyOn(agentEE.get('websockets'), 'emit')
    })

    it('emits ws-complete for OPEN or CLOSING WebSocket when pagehide event fires', async () => {
      ws.dispatchEvent(new Event('open'))
      Object.defineProperty(ws, 'readyState', { value: WebSocket.OPEN, writable: true })

      const socketId = ws.nrData.socketId
      const openedAt = ws.nrData.openedAt

      // Dispatch a pagehide event on the window
      window.dispatchEvent(new Event('pagehide'))

      // Verify ws-complete was emitted
      expect(emitSpy).toHaveBeenCalledTimes(1)
      expect(emitSpy).toHaveBeenCalledWith('ws', [expect.objectContaining({
        socketId,
        closedAt: expect.any(Number),
        closeCode: 1001,
        closeReason: 'Page navigating away',
        closeWasClean: false
      })], ws)

      const emittedData = emitSpy.mock.calls[0][1][0]
      expect(emittedData.connectedDuration).toBeDefined()
      expect(openedAt).toBeDefined()
      expect(emittedData.closedAt).toBeGreaterThanOrEqual(openedAt)
      expect(emittedData.connectedDuration).toBe(emittedData.closedAt - openedAt)
    })

    const noEmitTestCases = [
      {
        state: 'CONNECTING',
        readyState: WebSocket.CONNECTING
      },
      {
        state: 'CLOSED',
        readyState: WebSocket.CLOSED
      }
    ]

    noEmitTestCases.forEach(({ state, readyState }) => {
      it(`does NOT emit ws-complete for ${state} WebSocket when pagehide event fires`, async () => {
        if (state === 'CLOSED') {
          ws.dispatchEvent(new Event('open'))
          ws.dispatchEvent(new CloseEvent('close', { code: 1000, reason: 'Normal closure', wasClean: true }))
          emitSpy.mockClear() // Clear previous emit from close event
        }
        Object.defineProperty(ws, 'readyState', { value: readyState, writable: true })

        // Dispatch a pagehide event on the window
        window.dispatchEvent(new Event('pagehide'))

        // Verify ws-complete was NOT emitted
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })
  })
})
