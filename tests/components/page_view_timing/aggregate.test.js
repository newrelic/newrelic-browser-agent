import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as Timings } from '../../../src/features/page_view_timing/instrument'
import * as pageVisibilityModule from '../../../src/common/window/page-visibility'
import { VITAL_NAMES } from '../../../src/common/vitals/constants'
import { getHarvestCalls } from '../../util/basic-checks'
import qp from '@newrelic/nr-querypack'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'

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
  await new Promise((resolve, reject) => {
    setTimeout(resolve, 100) // wait for the feature to initialize
  })
})

afterEach(() => {
  resetAgent(mainAgent)
  jest.clearAllMocks()
})

const expectedNetworkInfo = {
  'net-type': expect.any(String),
  'net-etype': expect.any(String),
  'net-rtt': expect.any(Number),
  'net-dlink': expect.any(Number)
}

test('LCP event with CLS attribute', () => {
  const lcpNode = findTimingNode(VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)

  expect(findTimingAttribute(lcpNode, 'cls')).toEqual(0.1119) // 'CLS value should be the one present at the time LCP happened'

  Object.entries(expectedNetworkInfo).forEach(([key, value]) => {
    expect(findTimingAttribute(lcpNode, key)).toEqual(value)
  })
})

test('sends expected FI *once* with attributes when available', () => {
  const fiNode = findTimingNode('fi')
  expect(fiNode).toBeDefined()
  expect(fiNode.value).toEqual(8853) // event time data is sent in ms

  expect(findTimingAttribute(fiNode, 'cls')).toEqual(0.1119)

  Object.entries(expectedNetworkInfo).forEach(([key, value]) => {
    expect(findTimingAttribute(fiNode, key)).toEqual(value)
  })
})

test('sends CLS node with right val on vis change', () => {
  let clsNode = timingsAggregate.events.get().find(tn => tn.name === VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT)
  expect(clsNode).toBeUndefined()

  pageVisibilityModule.subscribeToVisibilityChange.mock.calls[1][0]()

  // check the event buffer since it wasnt captured in the initial harvest
  clsNode = timingsAggregate.events.get().find(tn => tn.name === VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT)
  expect(clsNode).toBeTruthy()
  expect(clsNode.value).toEqual(111.9) // since cls multiply decimal by 1000 to offset consumer division by 1000
  expect(clsNode.attrs.cls).toBeUndefined() // cls node doesn't need cls property
})

test('sends INP node with right val', () => {
  const inpNode = findTimingNode(VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)
  expect(inpNode).toBeTruthy()
  expect(inpNode.value).toEqual(8)
  expect(inpNode.attributes.find(attr => attr.key === 'cls').value).toEqual(0.1119)
})

test('does not obfuscate timing names or attribute keys', async () => {
  const localAgent = setupAgent({
    init: {
      obfuscate: [
        { regex: /lcp/ig, replacement: 'CORRUPTED_LCP', eventFilter: ['PageViewTiming'] },
        { regex: /fcp/ig, replacement: 'CORRUPTED_FCP', eventFilter: ['PageViewTiming'] },
        { regex: /fi/ig, replacement: 'CORRUPTED_FI', eventFilter: ['PageViewTiming'] },
        { regex: /sensitive/g, replacement: 'OBFUSCATED', eventFilter: ['PageViewTiming'] },
        { regex: /e/ig, replacement: 'E', eventFilter: ['PageViewTiming'] }
      ]
    },
    info: {
      jsAttributes: { sensitiveCustomKey: 'sensitiveCustomValue' }
    }
  })

  const localInstrument = new Timings(localAgent)
  await new Promise(process.nextTick)
  const localAggregate = localInstrument.featAggregate
  localAggregate.ee.emit('rumresp', {})
  await new Promise(resolve => setTimeout(resolve, 100))

  const harvestCall = getHarvestCalls(localAgent)[0]
  expect(harvestCall.results.value.payload.body).not.toContain('CORRUPTED')
  const decodedPayloads = qp.decode(harvestCall.results.value.payload.body)
  const findTimings = (timingName) => decodedPayloads.find(n => n.name === timingName)

  const lcp = findTimings(VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)
  const checkLcpAttrs = (obj) => expect(lcp.attributes).toEqual(expect.arrayContaining([expect.objectContaining(obj)]))
  checkLcpAttrs({ key: 'timeToFirstByte' })
  checkLcpAttrs({ key: 'resourceLoadDelay' })
  checkLcpAttrs({ key: 'resourceLoadDuration' })
  checkLcpAttrs({ key: 'resourceLoadTime' })
  checkLcpAttrs({ key: 'elementRenderDelay' })

  const fcp = findTimings(VITAL_NAMES.FIRST_CONTENTFUL_PAINT)
  const checkFcpAttrs = (obj) => expect(fcp.attributes).toEqual(expect.arrayContaining([expect.objectContaining(obj)]))
  checkFcpAttrs({ key: 'timeToFirstByte' })
  checkFcpAttrs({ key: 'firstByteToFCP' })
  checkFcpAttrs({ key: 'loadState' })

  const fi = findTimings(VITAL_NAMES.FIRST_INTERACTION)
  const checkFiAttrs = (obj) => expect(fi.attributes).toEqual(expect.arrayContaining([expect.objectContaining(obj)]))
  checkFiAttrs({ key: 'type', value: 'pointer' })
  checkFiAttrs({ key: 'eventTarget', value: 'button' })
  checkFiAttrs({ key: 'loadState', value: 'complete' })

  const inp = findTimings(VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)
  const checkInpAttrs = (obj) => expect(inp.attributes).toEqual(expect.arrayContaining([expect.objectContaining(obj)]))
  checkInpAttrs({ key: 'metricId' })
  checkInpAttrs({ key: 'eventTarget', value: 'button' })
  checkInpAttrs({ key: 'eventTime' })
  checkInpAttrs({ key: 'interactionTarget', value: 'button' })
  checkInpAttrs({ key: 'interactionTime' })
  checkInpAttrs({ key: 'interactionType', value: 'pointer' })
  checkInpAttrs({ key: 'inputDelay' })
  checkInpAttrs({ key: 'nextPaintTime' })
  checkInpAttrs({ key: 'processingDuration' })
  checkInpAttrs({ key: 'presentationDelay' })
  checkInpAttrs({ key: 'loadState', value: 'complete' })

  const globalAttrs = []
  globalAttrs.push({ key: 'pageUrl' })
  globalAttrs.push({ key: 'net-type', value: 'cellular' })
  globalAttrs.push({ key: 'net-etype', value: '3g' })
  globalAttrs.push({ key: 'net-rtt' })
  globalAttrs.push({ key: 'net-dlink' })
  globalAttrs.push({ key: 'cls' })
  globalAttrs.push({ key: 'webdriverDetected' })
  globalAttrs.push({ key: 'sensitiveCustomKey', value: 'OBFUSCATEDCustomValuE' })
  globalAttrs.forEach(obj => {
    checkLcpAttrs(obj)
    checkFcpAttrs(obj)
    checkFiAttrs(obj)
    checkInpAttrs(obj)
  })

  resetAgent(localAgent)
})

function findTimingNode (name) {
  const harvestCalls = getHarvestCalls(mainAgent)
  const harvest = harvestCalls.find(call => call.featureName === FEATURE_NAMES.pageViewTiming && call.results.value.payload.body.includes(name))
  const decodedHarvest = qp.decode(harvest.results.value.payload.body)
  return decodedHarvest.find(tn => tn.name === name)
}

function findTimingAttribute (node, attributeName) {
  return node.attributes.find(attr => attr.key === attributeName).value
}
