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
        }
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

describe('clock offset correction for iframe timings', () => {
  let setupIframeMFEMessageListener
  let capturedHandler
  let mockAgent
  let registeredEntity
  let mockNow
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

    mockNow = jest.fn()
    jest.doMock('../../../../src/common/timing/now', () => ({ now: mockNow }))

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

  it('offsets numeric timing values by the gap between the container and iframe clocks captured at registration', async () => {
    mockNow.mockReturnValueOnce(130) // container's now() when processing REGISTER
    await capturedHandler({
      origin,
      source: { postMessage: jest.fn() },
      data: {
        type: 'newrelic-iframe-api',
        messageId: 1,
        entries: [{ method: 'register', args: [{ id: 'my-id', name: 'my-name' }] }],
        iframeInterfaceId: 'abc123',
        timestamp: 100 // iframe's own now() when it sent REGISTER
      }
    })
    // clockOffset = 130 - 100 = 30

    capturedHandler({
      origin,
      data: {
        type: 'newrelic-iframe-timing-update',
        iframeInterfaceId: 'abc123',
        entries: [{ property: 'fetchStart', value: 50 }] // iframe-relative value
      }
    })

    expect(registeredEntity.metadata.timings.fetchStart).toBe(80) // 50 + 30
  })

  it('leaves non-numeric timing values (asset/type) untouched', async () => {
    mockNow.mockReturnValueOnce(130)
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
})
