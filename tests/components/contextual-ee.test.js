import { faker } from '@faker-js/faker'

let mockNREUM

beforeEach(() => {
  mockNREUM = {}
  jest.doMock('../../src/common/window/nreum', () => ({
    __esModule: true,
    gosNREUM: jest.fn(() => mockNREUM)
  }))
})

afterEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
})

describe('global event-emitter', () => {
  test('it sets the global event-emitter on window.NREUM when it does not already exist', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')

    expect(ee).toEqual(mockNREUM.ee)
  })

  test('it does not set the global event-emitter on window.NREUM when it already exists', async () => {
    mockNREUM.ee = {}

    const { ee } = await import('../../src/common/event-emitter/contextual-ee')

    expect(ee).not.toEqual(mockNREUM.ee)
  })
})

describe('scoping event-emitter', () => {
  test('it creates a new child event-emitter', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')

    const childName = faker.string.uuid()
    const result = ee.get(childName)

    expect(result).not.toEqual(mockNREUM.ee)
    expect(result).toEqual(ee.get(childName)) // Should always return the same event-emitter
    expect(result.debugId).toEqual(childName)
  })

  test('it creates a child event-emitter with an isolated backlog', async () => {
    const childName = faker.string.alphanumeric(16)
    mockNREUM.initializedAgents = {
      [childName]: {
        runtime: { isolatedBacklog: true }
      }
    }

    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const result = ee.get(childName)

    expect(ee.backlog === result.backlog).toBe(false)
  })
})

describe('event-emitter context', () => {
  test('it returns a new context', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')

    const result = ee.context()

    expect(result).toEqual(expect.objectContaining({
      contextId: expect.stringContaining('nr@context:')
    }))
  })

  test('it returns the same context', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')

    const result = ee.context()

    expect(result).toBe(ee.context(result))
  })

  test('it adds the context to the provided object', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')

    const obj = {}
    const result = ee.context(obj)
    const ctxKey = Object.getOwnPropertyNames(obj).find(k => k.startsWith('nr@context'))

    expect(result).toBe(obj[ctxKey])
  })
})

describe('event-emitter buffer', () => {
  test('it should create a new buffer for the given group', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const eventType = faker.string.uuid()
    const group = faker.string.uuid()

    ee.buffer([eventType], group)

    expect(ee.backlog).toEqual(expect.objectContaining({
      [group]: []
    }))
    expect(ee.isBuffering(eventType)).toEqual(true)
  })

  test('it should default group to "feature"', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const eventType = faker.string.uuid()

    ee.buffer([eventType])

    expect(ee.backlog).toEqual(expect.objectContaining({
      feature: []
    }))
    expect(ee.isBuffering(eventType)).toEqual(true)
  })

  test('it should not create buffer if event-emitter is aborted', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const eventType = faker.string.uuid()
    const group = faker.string.uuid()

    ee.backlog = {
      api: ['foo', 'bar', 'baz']
    }
    ee.abort()
    ee.buffer([eventType], group)

    expect(ee.backlog).toEqual({})
    expect(ee.isBuffering(eventType)).toEqual(false)
  })

  test('it should empty the backlog on abort as opposed to replacing it', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')

    const backlog = {
      api: ['foo', 'bar', 'baz']
    }
    ee.backlog = backlog
    ee.abort()

    expect(ee.backlog).toBe(backlog)
    expect(ee.backlog).toEqual({})
  })

  test('buffered data should not emit until drain', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const { drain } = await import('../../src/common/drain/drain')
    const { handle } = await import('../../src/common/event-emitter/handle')
    const { registerHandler } = await import('../../src/common/event-emitter/register-handler')
    const mockListener = jest.fn()
    const eventType = faker.string.uuid()
    const eventArgs = ['a', 'b', 'c']

    handle(eventType, eventArgs, undefined, undefined, ee)

    expect(ee.backlog).toEqual(expect.objectContaining({
      feature: [
        expect.arrayContaining([
          ee,
          eventType,
          eventArgs,
          expect.anything()
        ])
      ]
    }))
    expect(ee.isBuffering(eventType)).toEqual(true)
    expect(mockListener).toHaveReturnedTimes(0) // wont return until drain is called

    registerHandler(eventType, mockListener, undefined, ee)
    drain('globalEE')

    handle(eventType, eventArgs, undefined, undefined, ee)
    handle(eventType, eventArgs, undefined, undefined, ee)

    expect(ee.backlog).toEqual(expect.objectContaining({
      feature: null
    }))
    expect(ee.isBuffering(eventType)).toEqual(false)
    expect(mockListener).toHaveReturnedTimes(3)
    expect(mockListener).toHaveBeenCalledWith(...eventArgs)
  })
})

describe('event-emitter abort', () => {
  test('it aborts if there is an API backlog', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')

    ee.backlog = {
      api: ['foo', 'bar', 'baz']
    }
    ee.abort()

    expect(ee.aborted).toEqual(true)
    expect(ee.backlog).toEqual({})
  })

  test('it aborts if there is a feature backlog', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')

    ee.backlog = {
      feature: ['foo', 'bar', 'baz']
    }
    ee.abort()

    expect(ee.aborted).toEqual(true)
    expect(ee.backlog).toEqual({})
  })
})

describe('event-emitter emit', () => {
  test('should execute the listener', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const mockListener = jest.fn()
    const eventType = faker.string.uuid()
    const eventArgs = ['a', 'b', 'c']

    ee.on(eventType, mockListener)
    ee.emit(eventType, eventArgs)

    expect(mockListener).toHaveBeenCalledWith(eventArgs[0], eventArgs[1], eventArgs[2])
  })

  test('should not execute the listener after removal', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const mockListener = jest.fn()
    const eventType = faker.string.uuid()
    const eventArgs = ['a', 'b', 'c']

    ee.on(eventType, mockListener)
    ee.emit(eventType, eventArgs)
    ee.removeEventListener(eventType, mockListener)
    ee.emit(eventType, eventArgs)

    expect(mockListener).toHaveBeenCalledTimes(1)
  })

  test('should return early if global event-emitter is aborted', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const mockListener = jest.fn()
    const eventType = faker.string.uuid()
    const eventArgs = ['a', 'b', 'c']

    ee.backlog = {
      api: ['foo', 'bar', 'baz']
    }
    ee.abort()
    ee.on(eventType, mockListener)
    ee.emit(eventType, eventArgs)

    expect(mockListener).toHaveBeenCalledTimes(0)
  })

  test('should still emit if global event-emitter is aborted but force flag is true', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const scopeEE = ee.get(faker.string.uuid())
    const mockScopeListener = jest.fn()
    const eventType = faker.string.uuid()
    const eventArgs = ['a', 'b', 'c']

    ee.backlog = {
      api: ['foo', 'bar', 'baz']
    }
    ee.abort()
    scopeEE.on(eventType, mockScopeListener)
    scopeEE.emit(eventType, eventArgs, {}, true)

    expect(mockScopeListener).toHaveBeenCalledTimes(1)
  })

  test('should bubble the event if bubble flag is true', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const scopeEE = ee.get(faker.string.uuid())
    const mockListener = jest.fn()
    const mockScopeListener = jest.fn()
    const eventType = faker.string.uuid()
    const eventArgs = ['a', 'b', 'c']

    ee.on(eventType, mockListener)
    scopeEE.on(eventType, mockScopeListener)
    scopeEE.emit(eventType, eventArgs, {}, false, true)

    expect(mockScopeListener).toHaveBeenCalledTimes(1)
    expect(mockListener).toHaveBeenCalledTimes(1)
  })

  test('should not bubble the event if bubble flag is false', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const scopeEE = ee.get(faker.string.uuid())
    const mockListener = jest.fn()
    const mockScopeListener = jest.fn()
    const eventType = faker.string.uuid()
    const eventArgs = ['a', 'b', 'c']

    ee.on(eventType, mockListener)
    scopeEE.on(eventType, mockScopeListener)
    scopeEE.emit(eventType, eventArgs, {}, false, false)

    expect(mockScopeListener).toHaveBeenCalledTimes(1)
    expect(mockListener).not.toHaveBeenCalled()
  })

  test('should buffer the event on the scoped event-emitter', async () => {
    const { ee } = await import('../../src/common/event-emitter/contextual-ee')
    const scopeEE = ee.get(faker.string.uuid())
    const mockListener = jest.fn()
    const mockScopeListener = jest.fn()
    const eventType = faker.string.uuid()
    const eventArgs = ['a', 'b', 'c']

    ee.on(eventType, mockListener)
    ee.buffer([eventType])
    scopeEE.on(eventType, mockScopeListener)
    scopeEE.buffer([eventType])
    scopeEE.emit(eventType, eventArgs, {}, false, false)

    expect(mockScopeListener).toHaveBeenCalledTimes(1)
    expect(mockListener).not.toHaveBeenCalled()
    expect(scopeEE.backlog.feature).toEqual(expect.arrayContaining([
      expect.arrayContaining([
        scopeEE,
        eventType,
        eventArgs,
        expect.objectContaining({
          contextId: expect.stringContaining('nr@context:')
        })
      ])
    ]))
    expect(ee.backlog.feature).toEqual(scopeEE.backlog.feature)
  })
})
