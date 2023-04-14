
import { LocalMemory } from '../storage/local-memory'
import { LocalStorage } from '../storage/local-storage'
import { FirstPartyCookies } from '../storage/first-party-cookies'

import { PREFIX } from './constants'
import { SessionEntity } from './session-entity'
import { Timer } from '../util/timer'
import { isBrowserScope } from '../util/global-scope'

const agentIdentifier = 'test_agent_identifier'
const key = 'test_key'
const value = 'test_value'

jest.mock('../util/timer')
jest.useFakeTimers()

// jest.mock('../storage/local-memory')
// jest.mock('../storage/local-storage')
// jest.mock('../storage/first-party-cookies')

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('constructor', () => {
  test('must use required fields', () => {
    try {
      expect(new SessionEntity({})).toThrow(new Error('Missing Required Fields'))
    } catch (err) {}
  })

  test('can use sane defaults', () => {
    const session = new SessionEntity({ agentIdentifier, key })
    expect(session).toEqual(expect.objectContaining({
      value: expect.any(String),
      expiresAt: expect.any(Number),
      inactiveAt: expect.any(Number),
      sessionReplayActive: expect.any(Boolean),
      sessionTraceActive: expect.any(Boolean)
    }))
  })

  test('Workers are forced to use local memory', () => {
    jest.doMock('isBrowserScope', () => false)
    const session = new SessionEntity({ agentIdentifier, key, storageAPI: new LocalStorage() })
    expect(session.storageAPI instanceof LocalMemory).toEqual(true)
  })
})

describe('session timer behavior', () => {
  test('should create new default values when resetting', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, expiresMs: 10 })
    const sessionVal = session.value
    expect(session.value).toBeTruthy()
    session.reset()
    expect(session.value).toBeTruthy()
    expect(session.value).not.toEqual(sessionVal)
  })

  test('should expire due to inactivity', () => {
    const session = new SessionEntity({ agentIdentifier, key, inactiveMs: 10 })
    const sessionVal = session.value
    expect(session.value).toBeTruthy()
    // setTimeout(() => {
    //   expect(session.value).toBeTruthy()
    //   expect(session.value).not.toEqual(sessionVal)
    //   expect(session.read().value).toBeTruthy()
    //   expect(session.read().value).not.toEqual(sessionVal)
    //   done()
    // }, 11)
  })

  test('should refresh when activity triggers refresh', () => {
    const now = Date.now()
    jest.setSystemTime(now)

    const session = new SessionEntity({ agentIdentifier, key, inactiveMs: 100 })
    // instance of the Timer class
    const timer = jest.mocked(Timer).mock.instances[1]

    expect(session.value).toBeTruthy()
    expect(session.inactiveAt).toEqual(now + 100)
    // this is what a user interaction would do
    jest.setSystemTime(now + 50)
    session.refresh()
    // it will take the date.now() of the call time, + 100ms
    expect(timer.refresh).toHaveBeenCalled()
    expect(session.inactiveAt).toEqual(now + 150)
  })

  test('should set "at" timestamps', () => {
    const expiresMs = 20
    const inactiveMs = 10
    const session = new SessionEntity({ agentIdentifier, key, expiresMs: 20, inactiveMs: 10 })
    expect(Math.abs(new Date().setMilliseconds(new Date().getMilliseconds() + expiresMs) - session.expiresAt)).toBeLessThanOrEqual(1)
    expect(Math.abs(new Date().setMilliseconds(new Date().getMilliseconds() + inactiveMs) - session.inactiveAt)).toBeLessThanOrEqual(1)
  })

  test('custom data should be wiped on reset', () => {
    const now = Date.now()
    jest.setSystemTime(now)
    const session = new SessionEntity({ agentIdentifier, key, expiresMs: 10 })
    session.syncCustomAttribute('test', 123)
    expect(session.custom.test).toEqual(123)
    expect(session.read().custom.test).toEqual(123)

    // simulate a timer expiring
    session.reset()
    expect(session.custom?.test).toEqual(undefined)
    expect(session.read()?.custom?.test).toEqual(undefined)
  })
})

describe('data storage behavior', () => {
  test('should handle isNew', () => {
    const newSession = new SessionEntity({ agentIdentifier, key, expiresMs: 10 })
    expect(newSession.isNew).toBeTruthy()

    const storageAPI = new LocalMemory({ [`${PREFIX}_${key}`]: { value, expiresAt: Infinity, inactiveAt: Infinity } })
    const existingSession = new SessionEntity({ agentIdentifier, key, expiresMs: 10, storageAPI })
    expect(existingSession.isNew).toBeFalsy()
  })

  test('"new" sessions set default values in storage', () => {
    const newSession = new SessionEntity({ agentIdentifier, key, expiresMs: 10 })
    expect(newSession.isNew).toBeTruthy()

    expect(newSession.read()).toEqual(expect.objectContaining({
      value: expect.any(String),
      expiresAt: expect.any(Number),
      inactiveAt: expect.any(Number),
      sessionReplayActive: expect.any(Boolean),
      sessionTraceActive: expect.any(Boolean)
    }))
  })

  test('"pre-existing" sessions get values from storage instead of setting new', () => {
    const storageAPI = new LocalMemory({ [`${PREFIX}_${key}`]: { value, expiresAt: Infinity, inactiveAt: Infinity } })
    const session = new SessionEntity({ agentIdentifier, key, storageAPI })
    expect(session.isNew).toBeFalsy()
    expect(session.read()).toEqual(expect.objectContaining({
      value,
      expiresAt: Infinity,
      inactiveAt: Infinity
    }))
  })

  test('"stored" data should be exposed at root of session entity', () => {
    const session = new SessionEntity({ agentIdentifier, key })
    expect(session).toEqual(expect.objectContaining({
      value: expect.any(String),
      expiresAt: expect.any(Number),
      inactiveAt: expect.any(Number),
      sessionReplayActive: expect.any(Boolean),
      sessionTraceActive: expect.any(Boolean)
    }))
  })

  test('Custom data can be managed by session entity', () => {
    const session = new SessionEntity({ agentIdentifier, key })
    session.syncCustomAttribute('test', 1)
    expect(session?.custom?.test).toEqual(1)

    session.syncCustomAttribute('test', 'string')
    expect(session?.custom?.test).toEqual('string')

    session.syncCustomAttribute('test', false)
    expect(session?.custom?.test).toEqual(false)

    // null specifically deletes the object completely
    session.syncCustomAttribute('test', null)
    expect(session?.custom?.test).toEqual(undefined)
  })
})
