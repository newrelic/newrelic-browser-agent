import { faker } from '@faker-js/faker'

let agentIdentifier
let agentSession
let mockEE

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
  mockEE = { [faker.string.uuid()]: faker.lorem.sentence() }
  agentSession = {
    state: {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
  }

  jest.doMock('../../../../src/common/config/info', () => ({
    __esModule: true,
    getInfo: jest.fn(),
    setInfo: jest.fn()
  }))
  jest.doMock('../../../../src/common/config/init', () => ({
    __esModule: true,
    getConfigurationValue: jest.fn(),
    getConfiguration: jest.fn().mockImplementation(() => ({}))
  }))
  jest.doMock('../../../../src/common/config/runtime', () => ({
    __esModule: true,
    getRuntime: jest.fn().mockImplementation(() => ({ session: agentSession }))
  }))
  jest.doMock('../../../../src/common/drain/drain', () => ({
    __esModule: true,
    drain: jest.fn()
  }))
  jest.doMock('../../../../src/common/event-emitter/contextual-ee', () => ({
    __esModule: true,
    ee: {
      get: jest.fn().mockReturnValue(mockEE)
    }
  }))
  jest.mock('../../../../src/common/event-emitter/register-handler', () => ({
    __esModule: true,
    registerHandler: jest.fn()
  }))
  jest.doMock('../../../../src/common/constants/runtime', () => ({
    __esModule: true,
    isBrowserScope: true
  }))
  jest.doMock('../../../../src/common/session/session-entity', () => ({
    __esModule: true,
    SessionEntity: jest.fn().mockReturnValue({
      state: agentSession.state,
      syncCustomAttribute: jest.fn()
    })
  }))
  jest.doMock('../../../../src/common/storage/local-storage.js', () => ({
    __esModule: true,
    LocalStorage: jest.fn()
  }))
})

afterEach(() => {
  jest.resetModules()
})

test('should register handlers and drain the session feature', async () => {
  const { setupAgentSession } = await import('../../../../src/features/utils/agent-session')
  const result = setupAgentSession(agentIdentifier)

  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')
  const { drain } = await import('../../../../src/common/drain/drain')

  expect(result).toEqual(expect.objectContaining(agentSession))
  expect(registerHandler).toHaveBeenNthCalledWith(1, 'api-setCustomAttribute', expect.any(Function), 'session', mockEE)
  expect(registerHandler).toHaveBeenNthCalledWith(2, 'api-setUserId', expect.any(Function), 'session', mockEE)
  expect(drain).toHaveBeenCalledWith(agentIdentifier, 'session')
})

test('should not drain the session feature more than once', async () => {
  const { setupAgentSession } = await import('../../../../src/features/utils/agent-session')
  const result1 = setupAgentSession(agentIdentifier)
  const result2 = setupAgentSession(agentIdentifier)

  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')
  const { drain } = await import('../../../../src/common/drain/drain')

  expect(result1).toEqual(expect.objectContaining(agentSession))
  expect(result2).toEqual(expect.objectContaining(agentSession))
  expect(registerHandler).toHaveBeenCalledTimes(2)
  expect(drain).toHaveBeenCalledTimes(1)
})

test('should set custom session data', async () => {
  const { getInfo } = await import('../../../../src/common/config/info')
  const agentInfo = {
    [faker.string.uuid()]: faker.lorem.sentence(),
    jsAttributes: {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
  }
  jest.mocked(getInfo).mockReturnValue(agentInfo)
  agentSession.state.custom = {
    [faker.string.uuid()]: faker.lorem.sentence()
  }

  const { setupAgentSession } = await import('../../../../src/features/utils/agent-session')
  setupAgentSession(agentIdentifier)

  expect(agentInfo.jsAttributes).toEqual(expect.objectContaining(agentSession.state.custom))
})

test('should not set custom session data in worker scope', async () => {
  const globalScope = await import('../../../../src/common/constants/runtime')
  jest.replaceProperty(globalScope, 'isBrowserScope', false)

  const { setInfo } = await import('../../../../src/common/config/info')
  const { setupAgentSession } = await import('../../../../src/features/utils/agent-session')
  setupAgentSession(agentIdentifier)

  expect(setInfo).not.toHaveBeenCalled()
})

test('should sync custom attributes', async () => {
  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')
  agentSession.syncCustomAttribute = jest.fn()

  const customProps = [
    [faker.date.recent(), faker.string.uuid(), faker.lorem.sentence()],
    [faker.date.recent(), faker.string.uuid(), faker.lorem.sentence()]
  ]

  const { setupAgentSession } = await import('../../../../src/features/utils/agent-session')
  const retVal = setupAgentSession(agentIdentifier)

  const setCustomAttributeHandler = jest.mocked(registerHandler).mock.calls[0][1]
  const setUserIdHandler = jest.mocked(registerHandler).mock.calls[1][1]

  setCustomAttributeHandler(...customProps[0])
  setUserIdHandler(...customProps[1])

  expect(retVal.syncCustomAttribute).toHaveBeenNthCalledWith(1, customProps[0][1], customProps[0][2])
  expect(retVal.syncCustomAttribute).toHaveBeenNthCalledWith(2, customProps[1][1], customProps[1][2])
})
