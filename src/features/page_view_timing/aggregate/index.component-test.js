import { Aggregator } from '../../../common/aggregate/aggregator'
import { ee } from '../../../common/event-emitter/contextual-ee'
import { setRuntime } from '../../../common/config/config'

// Note: these callbacks fire right away unlike the real web-vitals API which are async-on-trigger
jest.mock('web-vitals', () => ({
  __esModule: true,
  // eslint-disable-next-line
  onFID: jest.fn(cb => cb({
    value: 1234,
    entries: [{ name: 'pointerdown', startTime: 5 }]
  })),
  // eslint-disable-next-line
  onCLS: jest.fn((cb) => cb({
    value: 1,
    entries: [{ value: 1 }]
  })),
  // eslint-disable-next-line
  onFCP: jest.fn((cb) => cb({
    value: 1,
    entries: [{ value: 1 }]
  })),
  // eslint-disable-next-line
  onINP: jest.fn((cb) => cb({
    value: 1,
    entries: [{ value: 1 }]
  })),
  // eslint-disable-next-line
  onLCP: jest.fn((cb) => cb({
    value: 1,
    entries: [{ value: 1 }]
  }))
})
)
const expectedNetworkInfo = {
  'net-type': expect.any(String),
  'net-etype': expect.any(String),
  'net-rtt': expect.any(Number),
  'net-dlink': expect.any(Number)
}

let pvtAgg
const agentId = 'abcd'
describe('pvt aggregate tests', () => {
  beforeEach(async () => {
    jest.doMock('../../../common/util/feature-flags', () => ({
      __esModule: true,
      activatedFeatures: { [agentId]: { pvt: 1 } }
    }))
    // jest.doMock('../../../common/harvest/harvest', () => ({
    //   __esModule: true,
    //   send: jest.fn()
    // }))

    setRuntime(agentId, {})
    const { Aggregate } = await import('.')

    global.navigator.connection = {
      type: 'cellular',
      effectiveType: '3g',
      rtt: 270,
      downlink: 700
    }
    pvtAgg = new Aggregate(agentId, new Aggregator({ agentIdentifier: agentId, ee }))
    await pvtAgg.waitForFlags(([]))
    pvtAgg.prepareHarvest = jest.fn(() => ({}))
  })
  test('LCP event with CLS attribute', () => {
    const timing = find(pvtAgg.timings, function (t) {
      return t.name === 'lcp'
    })

    expect(timing.attrs.cls).toEqual(1) // 'CLS value should be the one present at the time LCP happened'
    expect(timing.attrs).toEqual(expect.objectContaining(expectedNetworkInfo))

    function find (arr, fn) {
      if (arr.find) {
        return arr.find(fn)
      }
      var match = null
      arr.forEach(function (t) {
        if (fn(t)) {
          match = t
        }
      })
      return match
    }
  })

  test('sends expected FI attributes when available', () => {
    expect(pvtAgg.timings.length).toBeGreaterThanOrEqual(1)
    const fiPayload = pvtAgg.timings.find(x => x.name === 'fi')
    expect(fiPayload.value).toEqual(5)
    expect(fiPayload.attrs).toEqual(expect.objectContaining({ type: 'pointerdown', fid: 1234, cls: 1, ...expectedNetworkInfo }))
  })
})
