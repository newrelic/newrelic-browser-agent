import { Connector } from '../../../../src/common/harvest/connector'
import { send } from '../../../../src/common/harvest/send'
import { activateFeatures } from '../../../../src/common/util/feature-flags'
import * as handleModule from '../../../../src/common/event-emitter/handle'
import { VERSION } from '../../../../src/common/constants/env'
import { TextEncoder } from 'util'

jest.mock('../../../../src/common/harvest/send', () => ({
  send: jest.fn()
}))

jest.mock('../../../../src/common/util/feature-flags', () => ({
  activateFeatures: jest.fn()
}))

describe('Connector', () => {
  let originalNewrelic

  beforeAll(() => {
    originalNewrelic = global.newrelic
  })

  afterAll(() => {
    global.newrelic = originalNewrelic
  })

  beforeEach(() => {
    jest.clearAllMocks()
    global.TextEncoder = TextEncoder
  })

  afterEach(() => {
    global.TextEncoder = undefined
  })

  test('does nothing when rum_v2 flag is disabled', () => {
    const agent = {
      init: { feature_flags: [] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: { appMetadata: {}, session: undefined },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)

    expect(send).not.toHaveBeenCalled()
    expect(agent.runtime.timeKeeper).toBeUndefined()
  })

  test('sends connect payload to connect endpoint', () => {
    send.mockReturnValue(true)

    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: { appMetadata: {}, session: undefined },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)

    expect(send).toHaveBeenCalledWith(agent, expect.objectContaining({
      endpoint: 'connect/2/license-key',
      raw: true,
      featureName: 'connect',
      localOpts: { sendEmptyBody: true, headers: undefined },
      payload: {
        body: {},
        qs: { a: 'app-id', v: VERSION, s: '0' }
      },
      cbFinished: expect.any(Function)
    }))
  })

  test('uses cached response and skips network request', () => {
    const cachedResponse = {
      app: { agents: [{ entityGuid: 'cached-guid' }], nrServerTime: Date.now() },
      config: { err: 1 }
    }

    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: {
        appMetadata: {},
        session: {
          state: { cachedRumResponse: cachedResponse },
          read: jest.fn(),
          write: jest.fn()
        }
      },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)

    expect(send).not.toHaveBeenCalled()
    expect(agent.runtime.appMetadata).toEqual(cachedResponse.app)
    expect(activateFeatures).toHaveBeenCalledWith(cachedResponse.config, agent)
  })

  test('processes successful connect response and caches it', () => {
    send.mockReturnValue(true)

    const session = {
      state: { cachedRumResponse: undefined },
      read: jest.fn(() => ({})),
      write: jest.fn()
    }
    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: {
        appMetadata: {},
        session
      },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)
    const cbFinished = send.mock.calls[0][1].cbFinished
    const response = {
      app: { agents: [{ entityGuid: 'guid-1' }], nrServerTime: Date.now() + 10000 },
      config: { err: 1, st: 1 }
    }
    cbFinished({
      sent: true,
      status: 200,
      retry: false,
      xhr: { status: 200 },
      responseText: JSON.stringify(response)
    })

    expect(session.write).toHaveBeenCalledWith({ cachedRumResponse: response })
    expect(agent.runtime.appMetadata).toEqual(response.app)
    expect(activateFeatures).toHaveBeenCalledWith(response.config, agent)
  })

  test('processes successful connect response without session', () => {
    send.mockReturnValue(true)

    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: {
        appMetadata: {},
        session: undefined
      },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)
    const cbFinished = send.mock.calls[0][1].cbFinished
    const response = {
      app: { agents: [{ entityGuid: 'guid-no-session' }], nrServerTime: Date.now() + 10000 },
      config: { err: 1, st: 1 }
    }
    cbFinished({
      sent: true,
      status: 200,
      retry: false,
      xhr: { status: 200 },
      responseText: JSON.stringify(response)
    })

    expect(agent.runtime.appMetadata).toEqual(response.app)
    expect(activateFeatures).toHaveBeenCalledWith(response.config, agent)
  })

  test('schedules retry on retriable connect failure', () => {
    jest.useFakeTimers()
    const timeoutSpy = jest.spyOn(global, 'setTimeout')
    send.mockReturnValue(true)

    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: {
        appMetadata: {},
        session: {
          state: { cachedRumResponse: undefined },
          read: jest.fn(() => ({})),
          write: jest.fn()
        }
      },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)
    const cbFinished = send.mock.calls[0][1].cbFinished
    cbFinished({
      sent: true,
      status: 429,
      retry: true,
      xhr: { status: 429 },
      responseText: ''
    })

    expect(timeoutSpy).toHaveBeenCalledTimes(1)

    jest.runAllTimers()

    expect(send).toHaveBeenLastCalledWith(agent, expect.objectContaining({
      localOpts: {
        sendEmptyBody: true,
        headers: [
          { key: 'X-Retry-Count', value: 1 },
          { key: 'X-Previous-Status', value: 429 }
        ]
      }
    }))

    timeoutSpy.mockRestore()
    jest.useRealTimers()
  })

  test('falls through to hard failure after max retry attempts and aborts', () => {
    send.mockReturnValue(true)
    global.newrelic = { ee: { backlog: { x: 'abc', y: null, z: 'def' } } }

    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: {
        appMetadata: {},
        session: {
          state: { cachedRumResponse: undefined },
          read: jest.fn(() => ({})),
          write: jest.fn()
        }
      },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)
    const cbFinished = send.mock.calls[0][1].cbFinished

    cbFinished({ sent: true, status: 429, retry: true, xhr: { status: 429 }, responseText: '' })
    cbFinished({ sent: true, status: 429, retry: true, xhr: { status: 429 }, responseText: '' })
    cbFinished({ sent: true, status: 429, retry: true, xhr: { status: 429 }, responseText: '' })

    expect(send).toHaveBeenCalledTimes(2) // connect request + metrics SM send
    expect(send).toHaveBeenLastCalledWith(agent, expect.objectContaining({
      featureName: 'metrics',
      endpoint: expect.any(String),
      payload: expect.objectContaining({
        body: expect.objectContaining({
          sm: expect.arrayContaining([
            expect.objectContaining({ params: { name: 'BCS/Error/429' } }),
            expect.objectContaining({ params: { name: 'BCS/Error/Duration/Ms' } }),
            expect.objectContaining({ params: { name: 'BCS/Error/Dropped/Bytes' } })
          ])
        })
      })
    }))
    expect(agent.ee.abort).toHaveBeenCalledTimes(1)
  })

  test('aborts on JSON parse error', () => {
    send.mockReturnValue(true)

    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: {
        appMetadata: {},
        session: {
          state: { cachedRumResponse: undefined },
          read: jest.fn(() => ({})),
          write: jest.fn()
        }
      },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)
    const cbFinished = send.mock.calls[0][1].cbFinished
    cbFinished({ sent: true, status: 200, retry: false, xhr: { status: 200 }, responseText: '{' })

    expect(agent.ee.abort).toHaveBeenCalledTimes(1)
  })

  test('aborts when timeKeeper processing fails', () => {
    send.mockReturnValue(true)

    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: {
        appMetadata: {},
        session: {
          state: { cachedRumResponse: undefined },
          read: jest.fn(() => ({})),
          write: jest.fn()
        }
      },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)
    agent.runtime.timeKeeper.processRumRequest = jest.fn(() => {})
    Object.defineProperty(agent.runtime.timeKeeper, 'ready', { value: false, configurable: true })

    const cbFinished = send.mock.calls[0][1].cbFinished
    cbFinished({
      sent: true,
      status: 200,
      retry: false,
      xhr: { status: 200 },
      responseText: JSON.stringify({
        app: { agents: [{ entityGuid: 'guid' }], nrServerTime: Date.now() + 10000 },
        config: { err: 1 }
      })
    })

    expect(agent.ee.abort).toHaveBeenCalledTimes(1)
  })

  test('reports invalid timestamp SM when timekeeper was already ready', () => {
    send.mockReturnValue(true)
    const handleSpy = jest.spyOn(handleModule, 'handle')

    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: {
        appMetadata: {},
        session: {
          state: { cachedRumResponse: undefined },
          read: jest.fn(() => ({})),
          write: jest.fn()
        }
      },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)
    Object.defineProperty(agent.runtime.timeKeeper, 'ready', { value: true, configurable: true })
    Object.defineProperty(agent.runtime.timeKeeper, 'correctedOriginTime', { value: 12000, configurable: true })
    agent.runtime.timeKeeper.processRumRequest = jest.fn(() => {})

    const cbFinished = send.mock.calls[0][1].cbFinished
    cbFinished({
      sent: true,
      status: 200,
      retry: false,
      xhr: { status: 200 },
      responseText: JSON.stringify({
        app: { agents: [{ entityGuid: 'guid' }], nrServerTime: 10000 },
        config: { err: 1 }
      })
    })

    expect(handleSpy).toHaveBeenCalledWith(
      'storeSupportabilityMetrics',
      ['Generic/TimeKeeper/InvalidTimestamp/Seen', 2000],
      undefined,
      'metrics',
      agent.ee
    )
    handleSpy.mockRestore()
  })

  test('applies cached response found during callback before processing live response', () => {
    send.mockReturnValue(true)

    const session = {
      state: { cachedRumResponse: undefined },
      read: jest.fn(() => ({})),
      write: jest.fn()
    }
    const agent = {
      init: { feature_flags: ['rum_v2'] },
      info: { licenseKey: 'license-key', applicationID: 'app-id' },
      runtime: {
        appMetadata: {},
        session
      },
      ee: { abort: jest.fn() }
    }

    new Connector(agent)
    const cbFinished = send.mock.calls[0][1].cbFinished

    const cached = {
      app: { agents: [{ entityGuid: 'cached-guid' }], nrServerTime: Date.now() + 10000 },
      config: { err: 1 }
    }
    session.state.cachedRumResponse = cached

    cbFinished({
      sent: true,
      status: 200,
      retry: false,
      xhr: { status: 200 },
      responseText: JSON.stringify({
        app: { agents: [{ entityGuid: 'live-guid' }], nrServerTime: Date.now() + 10000 },
        config: { err: 0 }
      })
    })

    expect(agent.runtime.appMetadata).toEqual(cached.app)
    expect(activateFeatures).toHaveBeenNthCalledWith(1, cached.config, agent)
  })
})
