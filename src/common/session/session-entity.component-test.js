import { PREFIX } from './constants'
import { SessionEntity } from './session-entity'

const agentIdentifier = 'test_agent_identifier'
const key = 'test_key'
const value = 'test_value'
class LocalMemory {
  constructor (initialState = {}) {
    this.state = initialState
  }

  get (key) {
    try {
      return this.state[key]
    } catch (err) {
      // Error is ignored
      return ''
    }
  }

  set (key, value) {
    try {
      if (value === undefined || value === null) return this.remove(key)
      this.state[key] = value
    } catch (err) {
      // Error is ignored
    }
  }

  remove (key) {
    try {
      delete this.state[key]
    } catch (err) {
      // Error is ignored
    }
  }
}
const model = {
  value: '',
  inactiveAt: 0,
  expiresAt: 0,
  updatedAt: Date.now(),
  sessionReplayMode: 0,
  sessionReplaySentFirstChunk: false,
  sessionTraceMode: 0,
  traceHarvestStarted: false,
  custom: {}
}

jest.mock('../timer/timer')
jest.mock('../timer/interaction-timer')
jest.useFakeTimers()

const mockBrowserScope = jest.fn().mockImplementation(() => true)
jest.mock('../constants/runtime', () => ({
  __esModule: true,
  get isBrowserScope () {
    return mockBrowserScope()
  },
  get globalScope () {
    return global.window
  }
}))

let storage
beforeEach(() => {
  jest.restoreAllMocks()
  mockBrowserScope.mockReturnValue(true)
  storage = new LocalMemory()
})

describe('constructor', () => {
  test('must use required fields', () => {
    try {
      expect(new SessionEntity({})).toThrow(new Error('Missing Required Fields'))
    } catch (err) {}
  })

  test('top-level properties are set and exposed', () => {
    const session = new SessionEntity({ agentIdentifier, key, storage })
    expect(session).toMatchObject({
      agentIdentifier: expect.any(String),
      key: expect.any(String),
      expiresMs: expect.any(Number),
      expiresTimer: expect.any(Object),
      inactiveMs: expect.any(Number),
      inactiveTimer: expect.any(Object),
      isNew: expect.any(Boolean),
      storage: expect.any(Object),
      state: expect.objectContaining({
        value: expect.any(String),
        expiresAt: expect.any(Number),
        inactiveAt: expect.any(Number),
        sessionReplayMode: expect.any(Number),
        sessionReplaySentFirstChunk: expect.any(Boolean),
        sessionTraceMode: expect.any(Number)
      })
    })
  })

  test('can use sane defaults', () => {
    const session = new SessionEntity({ agentIdentifier, key, storage })
    expect(session.state).toEqual(expect.objectContaining({
      value: expect.any(String),
      expiresAt: expect.any(Number),
      inactiveAt: expect.any(Number),
      updatedAt: expect.any(Number),
      sessionReplayMode: expect.any(Number),
      sessionReplaySentFirstChunk: expect.any(Boolean),
      sessionTraceMode: expect.any(Number)
    }))
  })

  test('expiresAt is the correct future timestamp - new session', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, storage, expiresMs: 100 })
    expect(session.state.expiresAt).toEqual(now + 100)
  })

  test('expiresAt is the correct future timestamp - existing session', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const existingData = new LocalMemory({ [`${PREFIX}_${key}`]: { ...model, value, expiresAt: now + 5000, inactiveAt: Infinity, updatedAt: now } })
    const session = new SessionEntity({ agentIdentifier, key, expiresMs: 100, storage: existingData })
    expect(session.state.expiresAt).toEqual(now + 5000)
  })

  test('expiresAt never expires if 0', () => {
    const session = new SessionEntity({ agentIdentifier, key, storage, expiresMs: 0 })
    expect(session.state.expiresAt).toEqual(Infinity)
  })

  test('inactiveAt is the correct future timestamp - new session', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, storage, inactiveMs: 100 })
    expect(session.state.inactiveAt).toEqual(now + 100)
  })

  test('inactiveAt is the correct future timestamp - existing session', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const existingData = new LocalMemory({ [`${PREFIX}_${key}`]: { ...model, value, inactiveAt: now + 5000, expiresAt: Infinity, updatedAt: now } })
    const session = new SessionEntity({ agentIdentifier, key, inactiveMs: 100, storage: existingData })
    expect(session.state.inactiveAt).toEqual(now + 5000)
  })

  test('inactiveAt never expires if 0', () => {
    const session = new SessionEntity({ agentIdentifier, key, storage, inactiveMs: 0 })
    expect(session.state.inactiveAt).toEqual(Infinity)
  })

  test('should handle isNew', () => {
    const newSession = new SessionEntity({ agentIdentifier, key, storage, expiresMs: 10 })
    expect(newSession.isNew).toBeTruthy()

    const newStorage = new LocalMemory({ [`${PREFIX}_${key}`]: { ...model, value, expiresAt: Infinity, inactiveAt: Infinity, updatedAt: Date.now() } })
    const existingSession = new SessionEntity({ agentIdentifier, key, expiresMs: 10, storage: newStorage })
    expect(existingSession.isNew).toBeFalsy()
  })

  test('invalid stored values sets new defaults', () => {
    // missing required fields
    const storage = new LocalMemory({ [`${PREFIX}_${key}`]: { invalid_fields: true } })
    const session = new SessionEntity({ agentIdentifier, key, storage })
    expect(session.state).toEqual(expect.objectContaining({
      value: expect.any(String),
      expiresAt: expect.any(Number),
      inactiveAt: expect.any(Number),
      updatedAt: expect.any(Number),
      sessionReplayMode: expect.any(Number),
      sessionReplaySentFirstChunk: expect.any(Boolean),
      sessionTraceMode: expect.any(Number)
    }))
  })

  test('expired expiresAt value in storage sets new defaults', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const storage = new LocalMemory({ [`${PREFIX}_${key}`]: { value, expiresAt: now - 100, inactiveAt: Infinity } })
    const session = new SessionEntity({ agentIdentifier, key, storage })
    expect(session.state).toEqual(expect.objectContaining({
      value: expect.any(String),
      expiresAt: expect.any(Number),
      inactiveAt: expect.any(Number),
      updatedAt: expect.any(Number),
      sessionReplayMode: expect.any(Number),
      sessionReplaySentFirstChunk: expect.any(Boolean),
      sessionTraceMode: expect.any(Number)
    }))
  })

  test('expired inactiveAt value in storage sets new defaults', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const storage = new LocalMemory({ [`${PREFIX}_${key}`]: { value, inactiveAt: now - 100, expiresAt: Infinity } })
    const session = new SessionEntity({ agentIdentifier, key, storage })
    expect(session.state).toEqual(expect.objectContaining({
      value: expect.any(String),
      expiresAt: expect.any(Number),
      inactiveAt: expect.any(Number),
      updatedAt: expect.any(Number),
      sessionReplayMode: expect.any(Number),
      sessionReplaySentFirstChunk: expect.any(Boolean),
      sessionTraceMode: expect.any(Number)
    }))
  })
})

describe('reset()', () => {
  test('should create new default values when resetting', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, storage, expiresMs: 10 })
    const sessionVal = session.value
    expect(session.state.value).toBeTruthy()
    session.reset()
    expect(session.state.value).toBeTruthy()
    expect(session.state.value).not.toEqual(sessionVal)
  })

  test('custom data should be wiped on reset', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, storage, expiresMs: 10 })
    session.syncCustomAttribute('test', 123)
    expect(session.state.custom.test).toEqual(123)
    expect(session.read().custom.test).toEqual(123)

    // simulate a timer expiring
    session.reset()
    expect(session.state.custom?.test).toEqual(undefined)
    expect(session.read()?.custom?.test).toEqual(undefined)
  })
})

describe('isNew', () => {
  test('is true after the session resets by timers | true -> true', async () => {
    const sessionInstance = new SessionEntity({ agentIdentifier, key, storage })
    expect(sessionInstance.isNew).toEqual(true)
    sessionInstance.reset() // imitate what expireMs and inactiveMs does on activation
    expect(sessionInstance.isNew).toEqual(true)
  })
  test('is true after the session resets by timers | false -> true', () => {
    storage.set(`${PREFIX}_${key}`, { ...model, value, expiresAt: Date.now() + 100000, inactiveAt: Date.now() + 100000, updatedAt: Date.now() })
    const sessionInstance = new SessionEntity({ agentIdentifier, key, storage })
    expect(sessionInstance.isNew).toEqual(false)
    sessionInstance.reset()
    expect(sessionInstance.isNew).toEqual(true)
  })
  test('is true if reset happens on initialization after time outs off-view | expiresAt', () => {
    storage.set(`${PREFIX}_${key}`, { ...model, value, expiresAt: Date.now() - 1, inactiveAt: Date.now() + 100000, updatedAt: Date.now() })
    const sessionInstance = new SessionEntity({ agentIdentifier, key, storage })
    expect(sessionInstance.isNew).toEqual(true)
  })
  test('is true if reset happens on initialization after time outs off-view | inactiveAt', () => {
    storage.set(`${PREFIX}_${key}`, { ...model, value, expiresAt: Date.now() + 100000, inactiveAt: Date.now() - 1, updatedAt: Date.now() })
    const sessionInstance = new SessionEntity({ agentIdentifier, key, storage })
    expect(sessionInstance.isNew).toEqual(true)
  })
})
describe('read()', () => {
  test('"new" sessions get data from read()', () => {
    const newSession = new SessionEntity({ agentIdentifier, key, storage, expiresMs: 10 })
    expect(newSession.isNew).toBeTruthy()

    expect(newSession.read()).toEqual(expect.objectContaining({
      value: expect.any(String),
      expiresAt: expect.any(Number),
      inactiveAt: expect.any(Number),
      sessionReplayMode: expect.any(Number),
      sessionReplaySentFirstChunk: expect.any(Boolean),
      sessionTraceMode: expect.any(Number)
    }))
  })

  test('"pre-existing" sessions get data from read()', () => {
    const storage = new LocalMemory({ [`${PREFIX}_${key}`]: { ...model, value, expiresAt: Infinity, inactiveAt: Infinity } })
    const session = new SessionEntity({ agentIdentifier, key, storage })
    expect(session.isNew).toBeFalsy()
    expect(session.read()).toEqual(expect.objectContaining({
      value,
      expiresAt: Infinity,
      inactiveAt: Infinity
    }))
  })
})

describe('write()', () => {
  test('write() sets data to top-level wrapper', () => {
    const session = new SessionEntity({ agentIdentifier, key, storage })
    expect(session.state.value).not.toEqual(value)
    expect(session.state.expiresAt).not.toEqual(Infinity)
    expect(session.state.inactiveAt).not.toEqual(Infinity)
    session.write({ ...session.state, value, expiresAt: Infinity, inactiveAt: Infinity })
    expect(session.state.value).toEqual(value)
    expect(session.state.expiresAt).toEqual(Infinity)
    expect(session.state.inactiveAt).toEqual(Infinity)
  })

  test('write() sets data that read() can access', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, storage })
    session.write({ ...session.state, value, expiresAt: now + 100, inactiveAt: now + 100 })
    const read = session.read()
    expect(read.value).toEqual(value)
    expect(read.expiresAt).toEqual(now + 100)
    expect(read.inactiveAt).toEqual(now + 100)
  })

  test('write() does not run with invalid data', () => {
    const session = new SessionEntity({ agentIdentifier, key, storage })
    let out = session.write()
    expect(out).toEqual(undefined)
    out = session.write('string')
    expect(out).toEqual(undefined)
    out = session.write(123)
    expect(out).toEqual(undefined)
    out = session.write(true)
    expect(out).toEqual(undefined)
    out = session.write(false)
    expect(out).toEqual(undefined)
  })
})

describe('refresh()', () => {
  test('refresh sets inactiveAt to future time', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, storage, inactiveMs: 100 })
    expect(session.state.inactiveAt).toEqual(now + 100)
    jest.setSystemTime(now + 1000)
    session.refresh()
    expect(session.state.inactiveAt).toEqual(now + 100 + 1000)
  })

  test('refresh resets the entity if expiresTimer is invalid', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, storage, value })
    expect(session.state.value).toEqual(value)
    session.write({ ...session.state, expiresAt: now - 1 })
    session.refresh()
    expect(session.state.value).not.toEqual(value)
  })

  test('refresh resets the entity if inactiveTimer is invalid', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, storage, value })
    expect(session.state.value).toEqual(value)
    session.write({ ...session.state, inactiveAt: now - 1 })
    session.refresh()
    expect(session.state.value).not.toEqual(value)
  })
})

describe('syncCustomAttribute()', () => {
  test('Custom data can be managed by session entity', () => {
    const session = new SessionEntity({ agentIdentifier, key, storage })

    // if custom has never been set, and a "delete" action is triggered, do nothing
    session.syncCustomAttribute('test', null)
    expect(session?.state?.custom?.test).toEqual(undefined)

    session.syncCustomAttribute('test', 1)
    expect(session?.state?.custom?.test).toEqual(1)

    session.syncCustomAttribute('test', 'string')
    expect(session?.state?.custom?.test).toEqual('string')

    session.syncCustomAttribute('test', false)
    expect(session?.state?.custom?.test).toEqual(false)

    // null specifically deletes the object completely
    session.syncCustomAttribute('test', null)
    expect(session?.state?.custom?.test).toEqual(undefined)
  })

  test('Only runs in browser scope', () => {
    mockBrowserScope.mockReturnValue(false)
    const session = new SessionEntity({ agentIdentifier, key, storage })
    session.syncCustomAttribute('test', 1)
    expect(session.read().custom?.test).toEqual(undefined)
  })
})
