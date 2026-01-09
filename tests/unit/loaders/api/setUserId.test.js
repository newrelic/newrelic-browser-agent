/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { faker } from '@faker-js/faker'

let mockAgent
let mockWarn
let mockAppendJsAttribute
let mockSetupAPI

beforeEach(async () => {
  mockAgent = {
    agentIdentifier: faker.string.uuid(),
    init: {},
    info: {
      jsAttributes: {}
    },
    runtime: {},
    ee: {
      buffer: jest.fn(),
      emit: jest.fn()
    }
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

  const { setupSetUserIdAPI } = await import('../../../../src/loaders/api/setUserId')
  setupSetUserIdAPI(mockAgent)
})

afterEach(() => {
  jest.resetModules()
  jest.restoreAllMocks()
})

describe('setupSetUserIdAPI', () => {
  test('should warn and return early if value is not a string or null', async () => {
    const handler = mockSetupAPI.mock.calls[0][1]

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
    const { SET_USER_ID } = await import('../../../../src/loaders/api/constants')

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
    const { SET_USER_ID } = await import('../../../../src/loaders/api/constants')

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
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'

    const handler = mockSetupAPI.mock.calls[0][1]

    handler('newUser', false)

    expect(mockAppendJsAttribute).toHaveBeenCalled()
    expect(mockAgent.ee.emit).not.toHaveBeenCalled()
  })

  test('should NOT reset session when resetSession is undefined', async () => {
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'

    const handler = mockSetupAPI.mock.calls[0][1]
    handler('newUser')

    expect(mockAppendJsAttribute).toHaveBeenCalled()
    expect(mockAgent.ee.emit).not.toHaveBeenCalled()
  })

  test('should reset session when user id changes and resetSession is true', async () => {
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'

    const handler = mockSetupAPI.mock.calls[0][1]
    handler('newUser', true)

    expect(mockAppendJsAttribute).not.toHaveBeenCalled()
    expect(mockAgent.ee.emit).toHaveBeenCalledWith('api-setUserIdAndResetSession', expect.arrayContaining(['newUser']), undefined)
  })

  test('should NOT reset session when setting user id for the first time (existing user id is undefined) and resetSession=true', async () => {
    mockAgent.info.jsAttributes = {} // No existing user id

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with user id for the first time with resetSession = true
    handler('newUser', true)

    expect(mockAppendJsAttribute).toHaveBeenCalled()
    expect(mockAgent.ee.emit).not.toHaveBeenCalled()
  })

  test('should NOT reset session when existing user id is null and resetSession=true', async () => {
    mockAgent.info.jsAttributes['enduser.id'] = null

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with new user id when existing is null
    handler('newUser', true)

    expect(mockAppendJsAttribute).toHaveBeenCalled()
    expect(mockAgent.ee.emit).not.toHaveBeenCalled()
  })

  test('should NOT reset session when setting same user id with resetSession=true', async () => {
    const userId = 'sameUser'
    mockAgent.info.jsAttributes['enduser.id'] = userId

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with same user id and resetSession = true
    handler(userId, true)

    expect(mockAppendJsAttribute).toHaveBeenCalled()
    expect(mockAgent.ee.emit).not.toHaveBeenCalled()
  })

  test('should reset session when changing from one user to another with resetSession=true', async () => {
    mockAgent.info.jsAttributes['enduser.id'] = 'user1'

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with different user id and resetSession = true
    handler('user2', true)

    expect(mockAppendJsAttribute).not.toHaveBeenCalled()
    expect(mockAgent.ee.emit).toHaveBeenCalledWith('api-setUserIdAndResetSession', expect.arrayContaining(['user2']), undefined)
  })

  test('should reset session when setting user id to null from existing user with resetSession=true', async () => {
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'

    const handler = mockSetupAPI.mock.calls[0][1]

    // Call with null to clear user id with resetSession = true
    handler(null, true)

    expect(mockAppendJsAttribute).not.toHaveBeenCalled()
    expect(mockAgent.ee.emit).toHaveBeenCalledWith('api-setUserIdAndResetSession', expect.arrayContaining([null]), undefined)
  })

  test('should buffer session reset when runtime.session does not exist (yet)', async () => {
    mockAgent.info.jsAttributes['enduser.id'] = 'existingUser'
    mockAgent.runtime = {} // No session object

    const handler = mockSetupAPI.mock.calls[0][1]

    // Should not throw error when session doesn't exist
    expect(() => handler('newUser', true)).not.toThrow()

    expect(mockAppendJsAttribute).not.toHaveBeenCalled()
    expect(mockAgent.ee.emit).toHaveBeenCalledWith('api-setUserIdAndResetSession', expect.arrayContaining(['newUser']), undefined)
  })
})
