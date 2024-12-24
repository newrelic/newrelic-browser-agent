import { VITAL_NAMES } from '../../../src/common/vitals/constants'

// Note: these callbacks fire right away unlike the real web-vitals API which are async-on-trigger
jest.mock('web-vitals/attribution', () => ({
  // eslint-disable-next-line
  onCLS: jest.fn((cb) => cb({
    value: 0.1119,
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
  })),
  // eslint-disable-next-line
  onLCP: jest.fn((cb) => cb({
    value: 1,
    attribution: {}
  }))
}))
let triggerVisChange
jest.mock('../../../src/common/window/page-visibility', () => ({
  subscribeToVisibilityChange: jest.fn(cb => { triggerVisChange ??= cb })
}))

const expectedNetworkInfo = {
  'net-type': expect.any(String),
  'net-etype': expect.any(String),
  'net-rtt': expect.any(Number),
  'net-dlink': expect.any(Number)
}

let pvtAgg
const agentIdentifier = 'abcd'
describe('pvt aggregate tests', () => {
  beforeEach(async () => {
    triggerVisChange = undefined
    jest.doMock('../../../src/common/util/feature-flags', () => ({
      __esModule: true,
      activatedFeatures: { [agentIdentifier]: { pvt: 1 } }
    }))

    const mainAgent = {
      agentIdentifier,
      info: { licenseKey: 'licenseKey', applicationID: 'applicationID' },
      init: { page_view_timing: {} },
      runtime: {}
    }
    const { Aggregate } = await import('../../../src/features/page_view_timing/aggregate')

    global.navigator.connection = {
      type: 'cellular',
      effectiveType: '3g',
      rtt: 270,
      downlink: 700
    }
    pvtAgg = new Aggregate(mainAgent)
    await pvtAgg.waitForFlags(([]))
    pvtAgg.prepareHarvest = jest.fn(() => ({}))
  })
  test('LCP event with CLS attribute', () => {
    const timing = find(pvtAgg.events.get()[0].data, function (t) {
      return t.name === 'lcp'
    })

    expect(timing.attrs.cls).toEqual(0.1119) // 'CLS value should be the one present at the time LCP happened'
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
    expect(pvtAgg.events.get()[0].data.length).toBeTruthy()
    const fiPayload = pvtAgg.events.get()[0].data.find(x => x.name === 'fi')
    expect(fiPayload.value).toEqual(5)
    expect(fiPayload.attrs).toEqual(expect.objectContaining({ type: 'pointerdown', fid: 1234, cls: 0.1119, ...expectedNetworkInfo }))
  })

  test('sends CLS node with right val on vis change', () => {
    let clsNode = pvtAgg.events.get()[0].data.find(tn => tn.name === VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT)
    expect(clsNode).toBeUndefined()

    triggerVisChange()
    clsNode = pvtAgg.events.get()[0].data.find(tn => tn.name === VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT)
    expect(clsNode).toBeTruthy()
    expect(clsNode.value).toEqual(111.9) // since cls multiply decimal by 1000 to offset consumer division by 1000
    expect(clsNode.attrs.cls).toBeUndefined() // cls node doesn't need cls property
  })
  test('sends INP node with right val', () => {
    let inpNode = pvtAgg.events.get()[0].data.find(tn => tn.name === VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)
    expect(inpNode).toBeTruthy()
    expect(inpNode.value).toEqual(8)
    expect(inpNode.attrs.cls).toEqual(0.1119)
  })
})
