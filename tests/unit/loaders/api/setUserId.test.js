/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { faker } from '@faker-js/faker'

let mockAgent
let mockWarn
let mockAppendJsAttribute
let mockSetupAPI

beforeEach(() => {
  mockAgent = {
    agentIdentifier: faker.string.uuid(),
    init: {},
    info: {
      jsAttributes: {}
    },
    runtime: {},
    ee: {}
  }

  mockWarn = jest.fn()
  mockAppendJsAttribute = jest.fn()
  mockSetupAPI = jest.fn()

  jest.doMock('../../../../src/common/util/console', () => ({
    __esModule: true,
    warn: mockWarn
  }))

  jest.doMock('../../../../src/loaders/api/sharedHandlers', () => ({
    __esModule: true,
    appendJsAttribute: mockAppendJsAttribute,
    setupAPI: mockSetupAPI
  }))
})

afterEach(() => {
  jest.resetModules()
  jest.restoreAllMocks()
})

describe('setupSetUserIdAPI', () => {
  test('should call setupAPI with correct parameters', async () => {
    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')
    const { SET_USER_ID } = await import('../../../../src/loaders/api/constants')

    setupSetUserIdAPI(mockAgent)

    expect(mockSetupAPI).toHaveBeenCalledWith(SET_USER_ID, expect.any(Function), mockAgent)
  })

  test('should warn and return early if value is not a string or null', async () => {
    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    // Get the handler function that was passed to setupAPI
    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with invalid types
    handler(123)
    expect(mockWarn).toHaveBeenCalledWith(41, 'number')

    handler({ user: 'id' })
    expect(mockWarn).toHaveBeenCalledWith(41, 'object')

    handler(true)
    expect(mockWarn).toHaveBeenCalledWith(41, 'boolean')

    handler(undefined)
    expect(mockWarn).toHaveBeenCalledWith(41, 'undefined')

    // appendJsAttribute should not have been called for invalid types
    expect(mockAppendJsAttribute).not.toHaveBeenCalled()
  })

  test('should accept string value and call appendJsAttribute', async () => {
    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')
    const { SET_USER_ID } = await import('../../../../src/loaders/api/constants')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]
    const userId = 'user123'

    handler(userId)

    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockAppendJsAttribute).toHaveBeenCalledWith(
      mockAgent,
      'enduser.id',
      userId,
      SET_USER_ID,
      true
    )
  })

  test('should accept null value and call appendJsAttribute', async () => {
    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')
    const { SET_USER_ID } = await import('../../../../src/loaders/api/constants')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    handler(null)

    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockAppendJsAttribute).toHaveBeenCalledWith(
      mockAgent,
      'enduser.id',
      null,
      SET_USER_ID,
      true
    )
  })

  test('should NOT reset session when resetSession is false (default)', async () => {
    const mockReset = jest.fn()
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'
    mockAgent.runtime.session = {
      reset: mockReset
    }

    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with new user id but resetSession = false
    handler('newUser', false)

    expect(mockReset).not.toHaveBeenCalled()
    expect(mockAppendJsAttribute).toHaveBeenCalled()
  })

  test('should NOT reset session when resetSession is undefined', async () => {
    const mockReset = jest.fn()
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'
    mockAgent.runtime.session = {
      reset: mockReset
    }

    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with new user id but resetSession not provided (defaults to false)
    handler('newUser')

    expect(mockReset).not.toHaveBeenCalled()
    expect(mockAppendJsAttribute).toHaveBeenCalled()
  })

  test('should reset session when user id changes and resetSession is true', async () => {
    const mockReset = jest.fn()
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'
    mockAgent.runtime.session = {
      reset: mockReset
    }

    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with new user id and resetSession = true
    handler('newUser', true)

    expect(mockReset).toHaveBeenCalledTimes(1)
    expect(mockAppendJsAttribute).toHaveBeenCalled()
  })

  test('should NOT reset session when setting user id for the first time (existing user id is undefined) and resetSession=true', async () => {
    const mockReset = jest.fn()
    mockAgent.info.jsAttributes = {} // No existing user id
    mockAgent.runtime.session = {
      reset: mockReset
    }

    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with user id for the first time with resetSession = true
    handler('newUser', true)

    expect(mockReset).not.toHaveBeenCalled()
    expect(mockAppendJsAttribute).toHaveBeenCalled()
  })

  test('should NOT reset session when existing user id is null and resetSession=true', async () => {
    const mockReset = jest.fn()
    mockAgent.info.jsAttributes['enduser.id'] = null
    mockAgent.runtime.session = {
      reset: mockReset
    }

    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with new user id when existing is null
    handler('newUser', true)

    expect(mockReset).not.toHaveBeenCalled()
    expect(mockAppendJsAttribute).toHaveBeenCalled()
  })

  test('should NOT reset session when setting same user id with resetSession=true', async () => {
    const mockReset = jest.fn()
    const userId = 'sameUser'
    mockAgent.info.jsAttributes['enduser.id'] = userId
    mockAgent.runtime.session = {
      reset: mockReset
    }

    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with same user id and resetSession = true
    handler(userId, true)

    expect(mockReset).not.toHaveBeenCalled()
    expect(mockAppendJsAttribute).toHaveBeenCalled()
  })

  test('should NOT reset session when runtime.session does not exist', async () => {
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'
    mockAgent.runtime = {} // No session object

    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    // Should not throw error when session doesn't exist
    expect(() => handler('newUser', true)).not.toThrow()
    expect(mockAppendJsAttribute).toHaveBeenCalled()
  })

  test('should reset session when changing from one user to another with resetSession=true', async () => {
    const mockReset = jest.fn()
    mockAgent.info.jsAttributes['enduser.id'] = 'user1'
    mockAgent.runtime.session = {
      reset: mockReset
    }

    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with different user id and resetSession = true
    handler('user2', true)

    expect(mockReset).toHaveBeenCalledTimes(1)
    expect(mockAppendJsAttribute).toHaveBeenCalled()
  })

  test('should reset session when setting user id to null from existing user with resetSession=true', async () => {
    const mockReset = jest.fn()
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'
    mockAgent.runtime.session = {
      reset: mockReset
    }

    const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')

    setupSetUserIdAPI(mockAgent)

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with null to clear user id with resetSession = true
    handler(null, true)

    expect(mockReset).toHaveBeenCalledTimes(1)
    expect(mockAppendJsAttribute).toHaveBeenCalled()
  })
})
