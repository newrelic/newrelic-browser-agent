import { faker } from '@faker-js/faker'

let agentSession
let mockEE
let mockAgent

beforeEach(() => {
  mockAgent = {
    agentIdentifier: faker.string.uuid(),
    init: {},
    info: {},
    runtime: {}
  }
  mockEE = { [faker.string.uuid()]: faker.lorem.sentence() }
  agentSession = {
    state: {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
  }

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
    SessionEntity: jest.fn().mockImplementation(({ agentIdentifier }) => ({
      agentIdentifier,
      state: agentSession.state,
      syncCustomAttribute: jest.fn()
    }))
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
  const result = setupAgentSession(mockAgent)

  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')
  const { drain } = await import('../../../../src/common/drain/drain')

  expect(result).toEqual(expect.objectContaining(agentSession))
  expect(registerHandler).toHaveBeenNthCalledWith(1, 'api-setCustomAttribute', expect.any(Function), 'session', mockEE)
  expect(registerHandler).toHaveBeenNthCalledWith(2, 'api-setUserId', expect.any(Function), 'session', mockEE)
  expect(drain).toHaveBeenCalledWith(mockAgent.agentIdentifier, 'session')
})

test('multiple calls to setupAgentSession for same agent does not re-execute it', async () => {
  const { setupAgentSession } = await import('../../../../src/features/utils/agent-session')
  const result1 = setupAgentSession(mockAgent)
  const result2 = setupAgentSession(mockAgent)

  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')
  const { drain } = await import('../../../../src/common/drain/drain')

  expect(result1).toEqual(expect.objectContaining(agentSession))
  expect(result2).toEqual(expect.objectContaining(agentSession))
  expect(registerHandler).toHaveBeenCalledTimes(2)
  expect(drain).toHaveBeenCalledTimes(1)
})

test('calls to setupAgentSession for different agents executes separately', async () => {
  const { setupAgentSession } = await import('../../../../src/features/utils/agent-session')
  const result1 = setupAgentSession(mockAgent)

  const agentId1 = mockAgent.agentIdentifier
  const agentId2 = mockAgent.agentIdentifier = faker.string.uuid()
  mockAgent.runtime = {} // this reset effectively imitates a different agent with a clean runtime.session state
  const result2 = setupAgentSession(mockAgent)

  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')
  const { drain } = await import('../../../../src/common/drain/drain')

  expect(result1.agentIdentifier).toEqual(agentId1)
  expect(result2.agentIdentifier).toEqual(agentId2)
  expect(registerHandler).toHaveBeenCalledTimes(4)
  expect(drain).toHaveBeenCalledTimes(2)
})

test('should set custom session data', async () => {
  mockAgent.info = {
    [faker.string.uuid()]: faker.lorem.sentence(),
    jsAttributes: {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
  }
  agentSession.state.custom = {
    [faker.string.uuid()]: faker.lorem.sentence()
  }

  const { setupAgentSession } = await import('../../../../src/features/utils/agent-session')
  setupAgentSession(mockAgent)

  expect(mockAgent.info.jsAttributes).toEqual(expect.objectContaining(agentSession.state.custom))
})

test('should sync custom attributes', async () => {
  const { registerHandler } = await import('../../../../src/common/event-emitter/register-handler')
  agentSession.syncCustomAttribute = jest.fn()

  const customProps = [
    [faker.date.recent(), faker.string.uuid(), faker.lorem.sentence()],
    [faker.date.recent(), faker.string.uuid(), faker.lorem.sentence()]
  ]

  const { setupAgentSession } = await import('../../../../src/features/utils/agent-session')
  const retVal = setupAgentSession(mockAgent)

  const setCustomAttributeHandler = jest.mocked(registerHandler).mock.calls[0][1]
  const setUserIdHandler = jest.mocked(registerHandler).mock.calls[1][1]

  setCustomAttributeHandler(...customProps[0])
  setUserIdHandler(...customProps[1])

  expect(retVal.syncCustomAttribute).toHaveBeenNthCalledWith(1, customProps[0][1], customProps[0][2])
  expect(retVal.syncCustomAttribute).toHaveBeenNthCalledWith(2, customProps[1][1], customProps[1][2])
})
