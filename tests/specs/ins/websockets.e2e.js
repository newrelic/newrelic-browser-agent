/**
 * @file WebSocket events test
 * Tests that WebSocket lifecycle events are captured and sent to the /ins endpoint
 */

import { testInsRequest, testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { onlyFirefox, onlySafari, supportsWebSocketsTesting } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(supportsWebSocketsTesting)('WebSocket wrapper', () => {
  it('should capture and harvest WebSocket events', async () => {
    // Set up network capture for INS endpoint
    const insCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })

    const url = await browser.testHandle.assetURL('websockets.html')
    await browser.url(url).then(() => browser.waitForAgentLoad())

    // Wait for the INS harvest with WebSocket events
    const [insHarvest] = await insCapture.waitForResult({ totalCount: 1 })
    const insPayload = insHarvest.request?.body?.ins
    expect(Array.isArray(insPayload)).toBe(true)

    const wsEvents = insPayload.filter(event => event.eventType === 'WebSocket')
    // Should have 2 WebSocket events (preLoad and postLoad)
    expect(wsEvents.length).toBe(2)

    // Verify each WebSocket event has the expected properties
    wsEvents.forEach(event => {
      expect(event.eventType).toBe('WebSocket')
      expect(event.socketId).toBeTruthy()
      expect(event.requestedUrl).toContain('ws://')
      expect(event.requestedUrl).toContain('/websocket')
      expect(event.requestedProtocols).toBeDefined() // can be empty string
      expect(event.timestamp).toBeGreaterThan(0)
      expect(event.currentUrl).toContain('/websockets.html')
      expect(event.openedAt).toBeGreaterThan(0)
      expect(event.openedAt).toBeGreaterThanOrEqual(event.timestamp)
      expect(event.protocol).toBeDefined() // negotiated protocol (can be empty string)
      expect(event.extensions).toBeDefined() // negotiated extensions (can be empty string)
      expect(event.binaryType).toBeDefined() // 'blob' or 'arraybuffer'
      expect(event.closedAt).toBeGreaterThan(0)
      expect(event.closedAt).toBeGreaterThanOrEqual(event.openedAt)
      expect(event.connectedDuration).toBeGreaterThanOrEqual(0)
      expect(event.closeCode).toBeDefined()
      expect(event.closeReason).toBeDefined() // can be empty string

      // Safari may have a false wasClean property on close events
      if (browserMatch(onlySafari)) {
        expect(typeof event.closeWasClean).toBe('boolean')
      } else {
        expect(event.closeWasClean).toBe(true)
      }
      expect(event.sendCount).toBe(1)
      expect(event.sendBytes).toBeGreaterThan(0)
      expect(event.sendBytesMin).toBeGreaterThan(0)
      expect(event.sendBytesMax).toBeGreaterThan(0)
      expect(event.sendTypes).toContain('string')
      expect(event.messageCount).toBe(1)
      expect(event.messageBytes).toBeGreaterThan(0)
      expect(event.messageBytesMin).toBeGreaterThan(0)
      expect(event.messageBytesMax).toBeGreaterThan(0)
      expect(event.messageTypes).toContain('string')
      expect(event.messageOrigin).toContain('ws://')
    })

    // Verify one is preload and one is postload based on URL query params
    const preLoadEvent = wsEvents.find(e => e.requestedUrl.includes('loaded=pre'))
    const postLoadEvent = wsEvents.find(e => e.requestedUrl.includes('loaded=post'))
    expect(preLoadEvent).toBeTruthy()
    expect(postLoadEvent).toBeTruthy()
    // All browsers, either natively or via Lambdatest, are super fickle and can have close codes of 1005 for preLoad WS, so it's unasserted.
    // Additionally, Safari can have close code of 1006 for postLoad WS.
    if (!browserMatch(onlySafari)) expect(postLoadEvent.closeCode).toBe(1000)

    // Verify session id (s) and trace id (ptid) query params are present and valid
    const { s: sessionId, ptid: traceId } = insHarvest.request.query
    ;[sessionId, traceId].forEach(param => {
      expect(param).toBeTruthy()
      expect(typeof param).toBe('string')
      expect(param.length).toBeGreaterThan(0)
    })
  })

  it('should track all WebSocket data types for send and message', async () => {
    const insCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })

    const url = await browser.testHandle.assetURL('websocket-multi-send-msg.html')
    await browser.url(url)
      .then(() => browser.waitForAgentLoad())

    // Wait for test to complete (all messages sent and received)
    await browser.waitUntil(
      () => browser.execute(() => window.testComplete),
      {
        timeout: 10000,
        timeoutMsg: 'Expected test to complete within 10 seconds'
      }
    )

    // Wait for the INS harvest with WebSocket event
    const [insHarvest] = await insCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const insPayload = insHarvest.request?.body?.ins
    expect(Array.isArray(insPayload)).toBe(true)
    const wsEvents = insPayload.filter(event => event.eventType === 'WebSocket')
    expect(wsEvents.length).toBe(1)

    const wsEvent = wsEvents[0]

    // Verify send metrics
    // Sent data sizes:
    // 1. "Hello string!" = 13 bytes
    // 2. ArrayBuffer(8) = 8 bytes
    // 3. Blob(["Hello Blob!"]) = 11 bytes
    // 4. Uint8Array([72, 101, 108, 108, 111]) = 5 bytes
    // 5. DataView with ArrayBuffer(16) = 16 bytes
    expect(wsEvent.sendCount).toBe(5)
    expect(wsEvent.sendBytes).toBe(53) // 13 + 8 + 11 + 5 + 16
    expect(wsEvent.sendBytesMin).toBe(5) // Uint8Array
    expect(wsEvent.sendBytesMax).toBe(16) // DataView

    // Verify all send types are tracked (order doesn't matter)
    const sendTypes = wsEvent.sendTypes.split(',')
    expect(sendTypes).toContain('string')
    expect(sendTypes).toContain('ArrayBuffer')
    expect(sendTypes).toContain('Blob')
    expect(sendTypes).toContain('TypedArray')
    expect(sendTypes).toContain('DataView')
    expect(sendTypes.length).toBe(5)

    // Verify message metrics (echoed back, same sizes as sent)
    expect(wsEvent.messageCount).toBe(5)
    expect(wsEvent.messageBytes).toBe(53) // Same as sendBytes
    expect(wsEvent.messageBytesMin).toBe(5) // Same as sendBytesMin
    expect(wsEvent.messageBytesMax).toBe(16) // Same as sendBytesMax

    // Verify message types - the test switches binaryType after receiving message 3:
    // - Message 1 (string echo): received as 'string'
    // - Messages 2-3 (ArrayBuffer, Blob echoes): received as 'ArrayBuffer' (binaryType='arraybuffer')
    // - Messages 4-5 (TypedArray, DataView echoes): received as 'Blob' (binaryType switches to 'blob')
    // So we should see all 3 types: string, ArrayBuffer, and Blob
    const messageTypes = wsEvent.messageTypes.split(',')
    expect(messageTypes.length).toBe(3) // 'string', 'ArrayBuffer', 'Blob'
    expect(messageTypes).toContain('string')
    expect(messageTypes).toContain('ArrayBuffer')
    expect(messageTypes).toContain('Blob')
  })

  it('should link WebSocket errors to JavaScriptError payloads via socketId', async () => {
    const insCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

    const url = await browser.testHandle.assetURL('websocket-error.html')
    await browser.url(url)
      .then(() => browser.waitForAgentLoad())
    await browser.waitUntil(
      () => browser.execute(() => window.testComplete),
      {
        timeout: 10000,
        timeoutMsg: 'Expected test to complete within 10 seconds'
      }
    )

    const [insHarvest] = await insCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const [errorsHarvest] = await errorsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    const insPayload = insHarvest.request?.body?.ins
    const wsEvents = insPayload.filter(event => event.eventType === 'WebSocket')
    expect(wsEvents.length).toBe(1)

    const wsEvent = wsEvents[0]
    expect(wsEvent.hasErrors).toBe(true)
    expect(wsEvent.socketId).toBeTruthy()

    const errors = errorsHarvest.request?.body?.err
    expect(Array.isArray(errors)).toBe(true)
    expect(errors.length).toBeGreaterThanOrEqual(1)

    // Verify message handler error is linked to the WebSocket
    const messageError = errors.find(err =>
      err.params?.message?.includes('message handler')
    )
    expect(messageError).toBeTruthy()
    expect(messageError.custom?.socketId).toBe(wsEvent.socketId)
  })

  // Test third-party WebSocket wrappers
  ;['robust-websocket', 'reconnecting-websocket'].forEach((thirdPartyWSWrapper) => {
    it('should work with known third-party WS wrapper - ' + thirdPartyWSWrapper, async () => {
      const insCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })

      const url = await browser.testHandle.assetURL(`test-builds/library-wrapper/${thirdPartyWSWrapper}.html`)
      await browser.url(url)
        .then(() => browser.waitForAgentLoad())

      const [insHarvest] = await insCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const insPayload = insHarvest.request?.body?.ins
      expect(Array.isArray(insPayload)).toBe(true)

      const wsEvents = insPayload.filter(event => event.eventType === 'WebSocket')
      expect(wsEvents.length).toBeGreaterThanOrEqual(1)

      const wsEvent = wsEvents[0]
      expect(wsEvent.eventType).toBe('WebSocket')
      expect(wsEvent.socketId).toBeTruthy()
      expect(wsEvent.requestedUrl).toContain('ws://')
      expect(wsEvent.openedAt).toBeGreaterThan(0)
      expect(wsEvent.closedAt).toBeGreaterThan(0)
      expect(wsEvent.sendCount).toBeGreaterThanOrEqual(1)
      expect(wsEvent.messageCount).toBeGreaterThanOrEqual(1)
    })
  })

  it('should capture WebSocket event when page navigates away with open connection', async () => {
    const insCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })

    // Load a simple instrumented page with websockets feature enabled
    const url = await browser.testHandle.assetURL('instrumented.html', {
      loader: 'spa',
      init: { feature_flags: ['websockets'] }
    })
    await browser.url(url).then(() => browser.waitForAgentLoad())

    // Create a WebSocket connection but don't close it - just let it stay open
    await browser.execute(() => {
      window.testWs = new WebSocket(`ws://${window.NREUM.info.beacon}/websocket`)
      window.wsOpened = false

      window.testWs.addEventListener('open', () => {
        window.wsOpened = true
        window.testWs.send('Hello from open connection!')
      })
    })

    // Wait for the WebSocket to actually open
    await browser.waitUntil(
      () => browser.execute(() => window.wsOpened === true),
      {
        timeout: 5000,
        timeoutMsg: 'WebSocket did not open within 5 seconds'
      }
    )

    // Navigate to a different page - the pagehide handler in wrap-websocket should emit ws-complete
    const rootUrl = await browser.testHandle.assetURL('/')
    await browser.url(rootUrl)

    // Wait for the harvest from the previous page (which should include the auto-closed WebSocket)
    const [insHarvest] = await insCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const insPayload = insHarvest.request?.body?.ins
    expect(Array.isArray(insPayload)).toBe(true)

    const wsEvents = insPayload.filter(event => event.eventType === 'WebSocket')
    expect(wsEvents.length).toBe(1)

    const wsEvent = wsEvents[0]
    expect(wsEvent.eventType).toBe('WebSocket')
    expect(wsEvent.openedAt).toBeGreaterThan(0)
    expect(wsEvent.closedAt).toBeGreaterThan(0)
    expect(wsEvent.closeCode).toBe(1001) // Going Away - set by wrap-websocket pagehide handler

    // Firefox's close event fires after pagehide and overwrites closeReason with empty string
    // Other browsers preserve the pagehide-set closeReason
    if (browserMatch(onlyFirefox)) {
      expect(wsEvent.closeReason).toBe('')
      expect(wsEvent.closeWasClean).toBe(true)
    } else {
      expect(wsEvent.closeReason).toBe('Page navigating away')
      expect(wsEvent.closeWasClean).toBe(false)
    }
    expect(wsEvent.connectedDuration).toBeGreaterThan(0)
    expect(wsEvent.sendCount).toBe(1) // We sent one message
  })
})
