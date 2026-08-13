/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IFRAME_API_RESPONSE } from '../../../src/common/constants/iframe-constants'

describe('RegisteredIframeEntity blocked state', () => {
  let RegisteredIframeEntity
  let messageListener
  let postMessage
  const parentOrigin = 'https://parent.example.com'
  const iframeInterfaceId = 'test-iframe-id'

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    postMessage = jest.fn()
    messageListener = null

    const fakeGlobalScope = {
      location: { ancestorOrigins: [parentOrigin] },
      document: { referrer: '' },
      parent: { postMessage },
      addEventListener: jest.fn((type, cb) => {
        if (type === 'message') messageListener = cb
      }),
      PerformanceObserver: undefined
    }

    jest.doMock('../../../src/common/constants/runtime', () => ({
      globalScope: fakeGlobalScope,
      isBrowserScope: true
    }))
    jest.doMock('../../../src/common/dom/iframe', () => ({
      isIFrameWindow: () => true
    }))
    jest.doMock('../../../src/common/util/console', () => ({
      warn: jest.fn()
    }))
    jest.doMock('../../../src/common/v2/script-tracker', () => ({
      findScriptTimings: () => ({})
    }))
    jest.doMock('../../../src/common/url/add-url', () => ({
      addUrl: jest.fn()
    }))
    jest.doMock('../../../src/common/ids/unique-id', () => ({
      generateUuid: () => iframeInterfaceId
    }))
    jest.doMock('../../../src/features/jserrors/shared/cast-error', () => ({
      castErrorEvent: jest.fn(),
      castError: jest.fn(),
      castPromiseRejectionEvent: jest.fn()
    }))
    jest.doMock('web-vitals', () => ({
      onCLS: jest.fn(),
      onFCP: jest.fn(),
      onINP: jest.fn(),
      onLCP: jest.fn()
    }))

    const module = await import('../../../src/interfaces/registered-iframe-entity')
    RegisteredIframeEntity = module.RegisteredIframeEntity
  })

  const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))

  const respondToLastMessage = (metadata) => {
    const [payload] = postMessage.mock.calls[postMessage.mock.calls.length - 1]
    messageListener({
      origin: parentOrigin,
      data: {
        type: IFRAME_API_RESPONSE,
        messageId: payload.messageId,
        iframeInterfaceId,
        result: undefined,
        metadata
      }
    })
  }

  it('becomes blocked when the registration response reports the container blocked the target', async () => {
    const entity = new RegisteredIframeEntity({ id: 'my-id', name: 'my-name' })
    await flushMicrotasks()

    expect(postMessage).toHaveBeenCalledTimes(1)
    respondToLastMessage({ target: { id: 'my-id', name: 'my-name', blocked: true } })
    await flushMicrotasks()

    expect(entity.blocked).toBe(true)
  })

  it('stays unblocked when the registration response reports the target as not blocked', async () => {
    const entity = new RegisteredIframeEntity({ id: 'my-id', name: 'my-name' })
    await flushMicrotasks()

    respondToLastMessage({ target: { id: 'my-id', name: 'my-name', blocked: false } })
    await flushMicrotasks()

    expect(entity.blocked).toBe(false)
  })

  it('ends up blocked locally after deregister(), even before/without the container confirming', async () => {
    const entity = new RegisteredIframeEntity({ id: 'my-id', name: 'my-name' })
    await flushMicrotasks()
    respondToLastMessage({ target: { id: 'my-id', name: 'my-name', blocked: false } })
    await flushMicrotasks()
    expect(entity.blocked).toBe(false)

    const deregisterPromise = entity.deregister()
    await flushMicrotasks()
    respondToLastMessage({ target: { id: 'my-id', name: 'my-name', blocked: true } })
    await deregisterPromise

    expect(entity.blocked).toBe(true)
  })
})
