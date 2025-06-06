import { VITAL_NAMES } from '../../../src/common/vitals/constants'
import { resetAgent, setupAgent } from '../setup-agent'

// Note: these callbacks fire right away unlike the real web-vitals API which are async-on-trigger
jest.mock('web-vitals/attribution', () => ({
  onCLS: jest.fn((cb) => cb({
    value: 0.1119,
    attribution: {}
  })),
  onFCP: jest.fn((cb) => cb({
    value: 1,
    attribution: {}
  })),
  onINP: jest.fn((cb) => cb({
    value: 8,
    attribution: {
      interactionType: 'pointer',
      interactionTime: 8853.8,
      interactionTarget: 'button',
      loadState: 'complete'
    }
  })),
  onLCP: jest.fn((cb) => cb({
    value: 1,
    attribution: {}
  }))
}))
let mockVisChanges = []
jest.mock('../../../src/common/window/page-visibility', () => ({
  subscribeToVisibilityChange: jest.fn(cb => {
    mockVisChanges.push(cb)
  })
}))
jest.mock('../../../src/common/harvest/harvester')

const expectedNetworkInfo = {
  'net-type': expect.any(String),
  'net-etype': expect.any(String),
  'net-rtt': expect.any(Number),
  'net-dlink': expect.any(Number)
}

Object.defineProperty(performance, 'getEntriesByType', {
  value: jest.fn().mockImplementation(entryType => {
    return [
      {
        cancelable: true,
        duration: 17,
        entryType,
        name: 'pointer',
        processingEnd: 8860,
        processingStart: 8859,
        startTime: 8853,
        target: { tagName: 'button' }
      }
    ]
  }),
  configurable: true,
  writable: true
})

let pvtAgg, mainAgent
describe('pvt aggregate tests', () => {
  beforeAll(() => {
    mainAgent = setupAgent()
  })
  beforeEach(async () => {
    mockVisChanges = []
    jest.doMock('../../../src/common/util/feature-flags', () => ({
      __esModule: true,
      activatedFeatures: { [mainAgent.agentIdentifier]: { pvt: 1 } }
    }))

    global.navigator.connection = {
      type: 'cellular',
      effectiveType: '3g',
      rtt: 270,
      downlink: 700
    }

    const { Instrument } = await import('../../../src/features/page_view_timing/instrument')
    const pvtInst = new Instrument(mainAgent)
    await pvtInst.onAggregateImported
    pvtAgg = pvtInst.featAggregate

    pvtAgg.prepareHarvest = jest.fn(() => ({}))
    pvtAgg.ee.emit('rumresp', [])
    await new Promise(process.nextTick)
  })

  afterEach(async () => {
    resetAgent(mainAgent.agentIdentifier)
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
    expect(fiPayload.value).toEqual(8853) // event time data is sent in ms
    expect(fiPayload.attrs).toEqual(expect.objectContaining({
      type: 'pointer',
      eventTarget: 'button',
      cls: 0.1119,
      ...expectedNetworkInfo
    }))
  })

  test('sends CLS node with right val on vis change', () => {
    let clsNode = pvtAgg.events.get()[0].data.find(tn => tn.name === VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT)
    expect(clsNode).toBeUndefined()

    mockVisChanges.forEach(cb => cb())
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
