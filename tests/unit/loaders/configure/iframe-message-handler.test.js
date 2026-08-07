/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

describe('handleMethodCall', () => {
  let handleMethodCall
  let mockWarn
  let mockEntity
  let mockGetRegisteredEntity

  const buildEvent = ({ method = 'noticeError', args = [], ...overrides } = {}) => ({
    origin: 'https://iframe.example.com',
    data: {
      iframeInterfaceId: 'abc123',
      entries: [{ method, args }],
      ...overrides
    }
  })

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    mockWarn = jest.fn()
    jest.doMock('../../../../src/common/util/console', () => ({
      warn: mockWarn
    }))

    mockEntity = {
      metadata: {
        target: {
          iframeOrigin: 'https://iframe.example.com'
        },
        events: {}
      },
      noticeError: jest.fn(() => 'noticed')
    }

    mockGetRegisteredEntity = jest.fn(() => mockEntity)
    jest.doMock('../../../../src/common/v2/utils', () => ({
      getRegisteredEntityByIframeInterfaceId: mockGetRegisteredEntity
    }))

    const module = await import('../../../../src/loaders/configure/iframe-message-handler')
    handleMethodCall = module.handleMethodCall
  })

  it('invokes an allowed public method on the entity', async () => {
    const event = buildEvent()
    const output = await handleMethodCall(event, {})

    expect(mockEntity.noticeError).toHaveBeenCalled()
    expect(output.result).toBe('noticed')
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it.each([
    'constructor',
    '__proto__',
    'prototype'
  ])('does not invoke unsafe property "%s"', async (method) => {
    const event = buildEvent({ method })
    const output = await handleMethodCall(event, {})

    expect(output.result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(35, method)
  })

  it('does not invoke a method that does not exist on the entity', async () => {
    const event = buildEvent({ method: 'doesNotExist' })
    const output = await handleMethodCall(event, {})

    expect(output.result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(35, 'doesNotExist')
  })
})

describe('iframe timing/vitals updates use the iframe-reported values directly', () => {
  let setupIframeMFEMessageListener
  let capturedHandler
  let mockAgent
  let registeredEntity
  const origin = 'https://iframe.example.com'

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    jest.doMock('../../../../src/common/util/console', () => ({ warn: jest.fn() }))
    jest.doMock('../../../../src/common/drain/drain', () => ({ drain: jest.fn() }))
    jest.doMock('../../../../src/common/event-emitter/register-handler', () => ({
      registerHandler: jest.fn((type, handler) => { capturedHandler = handler })
    }))

    registeredEntity = {
      metadata: {
        target: {},
        timings: { fetchStart: 0, registeredAt: 0, asset: undefined, type: 'unknown' },
        vitals: {}
      }
    }

    jest.doMock('../../../../src/common/v2/utils', () => ({
      getRegisteredEntityByIframeInterfaceId: jest.fn(() => registeredEntity)
    }))

    mockAgent = {
      init: { api: { register: { iframe_domains: [] } } },
      runtime: { listeningForIframeMessages: false },
      ee: {},
      register: jest.fn(() => registeredEntity)
    }

    const module = await import('../../../../src/loaders/configure/iframe-message-handler')
    setupIframeMFEMessageListener = module.setupIframeMFEMessageListener
    setupIframeMFEMessageListener(mockAgent)
  })

  it('sets numeric timing values from the iframe as-is, without any clock adjustment', async () => {
    await capturedHandler({
      origin,
      source: { postMessage: jest.fn() },
      data: {
        type: 'newrelic-iframe-api',
        messageId: 1,
        entries: [{ method: 'register', args: [{ id: 'my-id', name: 'my-name' }] }],
        iframeInterfaceId: 'abc123',
        timestamp: 100
      }
    })

    capturedHandler({
      origin,
      data: {
        type: 'newrelic-iframe-timing-update',
        iframeInterfaceId: 'abc123',
        entries: [{ property: 'fetchStart', value: 50 }]
      }
    })

    expect(registeredEntity.metadata.timings.fetchStart).toBe(50)
  })

  it('leaves non-numeric timing values (asset/type) untouched', async () => {
    await capturedHandler({
      origin,
      source: { postMessage: jest.fn() },
      data: {
        type: 'newrelic-iframe-api',
        messageId: 1,
        entries: [{ method: 'register', args: [{ id: 'my-id', name: 'my-name' }] }],
        iframeInterfaceId: 'abc123',
        timestamp: 100
      }
    })

    capturedHandler({
      origin,
      data: {
        type: 'newrelic-iframe-timing-update',
        iframeInterfaceId: 'abc123',
        entries: [{ property: 'asset', value: 'https://iframe.example.com/app.js' }]
      }
    })

    expect(registeredEntity.metadata.timings.asset).toBe('https://iframe.example.com/app.js')
  })

  it('sets fcp/lcp vitals from the iframe as-is, without any clock adjustment', async () => {
    await capturedHandler({
      origin,
      source: { postMessage: jest.fn() },
      data: {
        type: 'newrelic-iframe-api',
        messageId: 1,
        entries: [{ method: 'register', args: [{ id: 'my-id', name: 'my-name' }] }],
        iframeInterfaceId: 'abc123',
        timestamp: 100
      }
    })
    registeredEntity.metadata.vitals = { fcp: { value: null }, lcp: { value: null }, cls: { value: null }, inp: { value: null } }

    capturedHandler({
      origin,
      data: {
        type: 'newrelic-iframe-vitals-update',
        iframeInterfaceId: 'abc123',
        entries: [{ property: 'fcp', value: 45 }]
      }
    })

    expect(registeredEntity.metadata.vitals.fcp.value).toBe(45)
  })

  it('sets cls/inp vitals from the iframe as-is', async () => {
    await capturedHandler({
      origin,
      source: { postMessage: jest.fn() },
      data: {
        type: 'newrelic-iframe-api',
        messageId: 1,
        entries: [{ method: 'register', args: [{ id: 'my-id', name: 'my-name' }] }],
        iframeInterfaceId: 'abc123',
        timestamp: 100
      }
    })
    registeredEntity.metadata.vitals = { fcp: { value: null }, lcp: { value: null }, cls: { value: null }, inp: { value: null } }

    capturedHandler({
      origin,
      data: {
        type: 'newrelic-iframe-vitals-update',
        iframeInterfaceId: 'abc123',
        entries: [{ property: 'cls', value: 0.12 }]
      }
    })

    expect(registeredEntity.metadata.vitals.cls.value).toBe(0.12)
  })
})

describe('handleMethodCall timestamp propagation', () => {
  let handleMethodCall
  let mockEntity

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    jest.doMock('../../../../src/common/util/console', () => ({ warn: jest.fn() }))

    mockEntity = {
      metadata: {
        target: { iframeOrigin: 'https://iframe.example.com' },
        events: { latestTimestamp: undefined }
      },
      noticeError: jest.fn(() => 'noticed')
    }

    jest.doMock('../../../../src/common/v2/utils', () => ({
      getRegisteredEntityByIframeInterfaceId: jest.fn(() => mockEntity)
    }))

    const module = await import('../../../../src/loaders/configure/iframe-message-handler')
    handleMethodCall = module.handleMethodCall
  })

  it('stores the timestamp captured inside the iframe on entity.metadata.events.latestTimestamp before invoking the method', async () => {
    await handleMethodCall({
      origin: 'https://iframe.example.com',
      data: {
        iframeInterfaceId: 'abc123',
        entries: [{ method: 'noticeError', args: [] }],
        timestamp: 12345
      }
    }, {})

    expect(mockEntity.metadata.events.latestTimestamp).toBe(12345)
    expect(mockEntity.noticeError).toHaveBeenCalled()
  })
})
