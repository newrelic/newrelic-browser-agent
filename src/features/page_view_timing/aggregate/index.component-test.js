import { Aggregator } from '../../../common/aggregate/aggregator'
import { ee } from '../../../common/event-emitter/contextual-ee'
import { drain } from '../../../common/drain/drain'
import { setRuntime } from '../../../common/config/config'
import { VITAL_NAMES } from '../../../common/vitals/constants'

// Note: these callbacks fire right away unlike the real web-vitals API which are async-on-trigger
jest.mock('web-vitals', () => ({
  __esModule: true,
  // eslint-disable-next-line
  onLCP: jest.fn((cb) => cb({
    value: 1,
    entries: [{ value: 1 }]
  }))
}))

jest.mock('web-vitals/attribution', () => ({
  // eslint-disable-next-line
  onCLS: jest.fn((cb) => cb({
    value: 0.111,
    attribution: {}
  })),
  // eslint-disable-next-line
  onFCP: jest.fn((cb) => cb({
    value: 1,
    attribution: {}
  })),
  // eslint-disable-next-line
  onFID: jest.fn(cb => cb({
    value: 1234,
    attribution: { eventTime: 5, eventType: 'pointerdown' }
  })),
  // eslint-disable-next-line
  onINP: jest.fn((cb) => cb({
    value: 8,
    attribution: {}
  }))
}))
let triggerVisChange
jest.mock('../../../common/window/page-visibility', () => ({
  subscribeToVisibilityChange: jest.fn(cb => { triggerVisChange ??= cb })
}))

const expectedNetworkInfo = {
  'net-type': expect.any(String),
  'net-etype': expect.any(String),
  'net-rtt': expect.any(Number),
  'net-dlink': expect.any(Number)
}

let pvtAgg
describe('pvt aggregate tests', () => {
  beforeEach(async () => {
    triggerVisChange = undefined
    const { Aggregate } = await import('.')
    setRuntime('abcd', {})

    global.navigator.connection = {
      type: 'cellular',
      effectiveType: '3g',
      rtt: 270,
      downlink: 700
    }
    pvtAgg = new Aggregate('abcd', new Aggregator({ agentIdentifier: 'abcd', ee }))
    pvtAgg.scheduler.harvest.send = jest.fn()
    pvtAgg.prepareHarvest = jest.fn(() => ({}))
    drain('abcd', 'feature')
  })
  test('LCP event with CLS attribute', () => {
    const timing = find(pvtAgg.timings, function (t) {
      return t.name === 'lcp'
    })

    expect(timing.attrs.cls).toEqual(0.111) // 'CLS value should be the one present at the time LCP happened'
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
    expect(fiPayload.attrs).toEqual(expect.objectContaining({ type: 'pointerdown', fid: 1234, cls: 0.111, ...expectedNetworkInfo }))
  })

  test('sends CLS node with right val on vis change', () => {
    let clsNode = pvtAgg.timings.find(tn => tn.name === VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT)
    expect(clsNode).toBeUndefined()

    triggerVisChange()
    clsNode = pvtAgg.timings.find(tn => tn.name === VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT)
    expect(clsNode).toBeTruthy()
    expect(clsNode.value).toEqual(111) // since cls multiply decimal by 1000 to offset consumer division by 1000
    expect(clsNode.attrs.cls).toBeUndefined() // cls node doesn't need cls property
  })
  test('sends INP node with right val', () => {
    let inpNode = pvtAgg.timings.find(tn => tn.name === VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)
    expect(inpNode).toBeTruthy()
    expect(inpNode.value).toEqual(8)
    expect(inpNode.attrs.cls).toEqual(0.111)
  })
})
