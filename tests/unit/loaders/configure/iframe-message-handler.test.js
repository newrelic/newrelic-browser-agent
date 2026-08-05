/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

describe('handleMethodCall', () => {
  let handleMethodCall
  let mockWarn
  let mockEntity
  let mockGetRegisteredEntity

  const buildEvent = (overrides = {}) => ({
    origin: 'https://iframe.example.com',
    data: {
      iframeInterfaceId: 'abc123',
      method: 'noticeError',
      args: [],
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
