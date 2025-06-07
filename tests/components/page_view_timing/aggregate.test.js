import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as Timings } from '../../../src/features/page_view_timing/instrument'
import * as pageVisibilityModule from '../../../src/common/window/page-visibility'
import { VITAL_NAMES } from '../../../src/common/vitals/constants'

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

let mainAgent

beforeAll(async () => {
  global.navigator.connection = {
    type: 'cellular',
    effectiveType: '3g',
    rtt: 270,
    downlink: 700
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

  mainAgent = setupAgent()
})

let timingsAggregate

beforeEach(async () => {
  jest.spyOn(pageVisibilityModule, 'subscribeToVisibilityChange')

  const timingsInstrument = new Timings(mainAgent)
  await new Promise(process.nextTick)
  timingsAggregate = timingsInstrument.featAggregate
  timingsAggregate.ee.emit('rumresp', {})
})

afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
  jest.clearAllMocks()
})

const expectedNetworkInfo = {
  'net-type': expect.any(String),
  'net-etype': expect.any(String),
  'net-rtt': expect.any(Number),
  'net-dlink': expect.any(Number)
}

test('LCP event with CLS attribute', () => {
  const timing = find(timingsAggregate.events.get(), function (t) {
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

test('sends expected FI *once* with attributes when available', () => {
  expect(timingsAggregate.events.get().length).toBeGreaterThanOrEqual(1)
  const fiPayload = timingsAggregate.events.get().find(x => x.name === 'fi')
  expect(fiPayload.value).toEqual(8853) // event time data is sent in ms
  expect(fiPayload.attrs).toEqual(expect.objectContaining({
    type: 'pointer',
    eventTarget: 'button',
    cls: 0.1119,
    ...expectedNetworkInfo
  }))

  expect(timingsAggregate.events.get().filter(x => x.name === 'fi').length).toEqual(1)
})

test('sends CLS node with right val on vis change', () => {
  let clsNode = timingsAggregate.events.get().find(tn => tn.name === VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT)
  expect(clsNode).toBeUndefined()

  pageVisibilityModule.subscribeToVisibilityChange.mock.calls[1][0]()

  clsNode = timingsAggregate.events.get().find(tn => tn.name === VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT)
  expect(clsNode).toBeTruthy()
  expect(clsNode.value).toEqual(111.9) // since cls multiply decimal by 1000 to offset consumer division by 1000
  expect(clsNode.attrs.cls).toBeUndefined() // cls node doesn't need cls property
})

test('sends INP node with right val', () => {
  let inpNode = timingsAggregate.events.get().find(tn => tn.name === VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)
  expect(inpNode).toBeTruthy()
  expect(inpNode.value).toEqual(8)
  expect(inpNode.attrs.cls).toEqual(0.1119)
})
