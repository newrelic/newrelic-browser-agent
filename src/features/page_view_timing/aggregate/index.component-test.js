import { Aggregator } from '../../../common/aggregate/aggregator'
import { ee } from '../../../common/event-emitter/contextual-ee'
import { drain } from '../../../common/drain/drain'
import { setRuntime } from '../../../common/config/config'

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

let pvtAgg, cumulativeLayoutShift
describe('pvt aggregate tests', () => {
  beforeEach(async () => {
    const { Aggregate } = await import('.')
    setRuntime('abcd', {})
    pvtAgg = new Aggregate('abcd', new Aggregator({ agentIdentifier: 'abcd', ee }))
    pvtAgg.scheduler.harvest.send = jest.fn()
    pvtAgg.prepareHarvest = jest.fn(() => ({}))
    drain('abcd', 'feature')

    global.navigator.connection = {
      type: 'cellular',
      effectiveType: '3g',
      rtt: 270,
      downlink: 700
    }

    const { cumulativeLayoutShift: cls } = await import('../../../common/vitals/cumulative-layout-shift')
    cumulativeLayoutShift = cls
  })
  test('LCP event with CLS attribute', () => {
    cumulativeLayoutShift.update({ value: 1 })
    pvtAgg.addTiming('lcp', 1, { size: 1, startTime: 1 })

    var timing = find(pvtAgg.timings, function (t) {
      return t.name === 'lcp'
    })

    expect(timing.attrs.cls).toEqual(1) // 'CLS value should be the one present at the time LCP happened'

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
    expect(fiPayload.attrs).toEqual(expect.objectContaining({ type: 'pointerdown', fid: 1234, cls: 1 }))
  })
})
