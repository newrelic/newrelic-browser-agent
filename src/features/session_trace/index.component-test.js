import { SessionTrace } from '.'
import { Aggregator } from '../../common/aggregate/aggregator'
import { ee } from '../../common/event-emitter/contextual-ee'

jest.mock('../../common/config/config', () => ({
  __esModule: true,
  getConfiguration: jest.fn().mockReturnValue({}),
  getConfigurationValue: jest.fn((id, key) => {
    if (key === 'session_trace.maxNodesPerHarvest') return 1000
    return true
  }),
  getInfo: jest.fn().mockReturnValue({}),
  isConfigured: jest.fn().mockReturnValue(true),
  getRuntime: jest.fn().mockReturnValue({
    xhrWrappable: true,
    offset: Date.now()
  })
}))
jest.mock('../../common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: true,
  globalScope: global
}))
jest.mock('../../common/window/load', () => ({
  __esModule: true,
  onWindowLoad: jest.fn(cb => cb())
}))
jest.mock('../../common/session/session-entity', () => ({
  __esModule: true,
  SessionEntity: jest.fn().mockReturnValue({
    state: {},
    syncCustomAttribute: jest.fn()
  })
}))

const aggregator = new Aggregator({ agentIdentifier: 'abcd', ee })

describe('session trace', () => {
  test('creates right nodes', async () => {
    const traceInstrument = new SessionTrace('abcd', aggregator)

    // create session trace nodes for load events
    document.addEventListener('DOMContentLoaded', () => null)
    window.addEventListener('load', () => null)
    window.history.pushState(null, '', '#foo')
    window.history.pushState(null, '', '#bar')

    document.dispatchEvent(new CustomEvent('DOMContentLoaded')) // simulate natural browser event
    window.dispatchEvent(new CustomEvent('load')) // load is actually ignored by Trace as it should be passed by the PVT feature, so it should not be in payload
    await traceInstrument.onAggregateImported
    const traceAggregate = traceInstrument.featAggregate
    traceAggregate.traceStorage.storeXhrAgg('xhr', '[200,null,null]', { method: 'GET', status: 200 }, { rxSize: 770, duration: 99, cbTime: 0, time: 217 }) // fake ajax data
    traceAggregate.traceStorage.processPVT('fi', 30, { fid: 8 }) // fake pvt data]

    traceAggregate.resourceObserver = true // so takeSTNs will skip check for performance entries
    const payload = traceAggregate.traceStorage.takeSTNs()

    expect(payload.stns.length).toBeGreaterThan(0)
    payload.stns.forEach(node => {
      expect(node).toMatchObject({
        n: expect.any(String),
        s: expect.any(Number),
        e: expect.any(Number),
        o: expect.any(String)
      })
    })
    expect(payload.earliestTimeStamp).toEqual(Math.min(...payload.stns.map(node => node.s)))
    expect(payload.latestTimeStamp).toEqual(Math.max(...payload.stns.map(node => node.s)))
  })
})
