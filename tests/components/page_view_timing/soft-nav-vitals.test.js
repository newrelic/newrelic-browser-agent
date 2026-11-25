import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as Timings } from '../../../src/features/page_view_timing/instrument'
import { VITAL_NAMES } from '../../../src/common/vitals/constants'
import { getHarvestCalls } from '../../util/basic-checks'
import qp from '@newrelic/nr-querypack'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'

// POC (soft-nav spike): confirms the core NRQL pitch -- that `navigationType`/`navigationInteractionId` reach
// PageViewTiming as directly-queryable attributes with no agent code change needed beyond passing them through
// (see common/vitals/largest-contentful-paint.js), and no join back to BrowserInteraction required to discriminate
// hard vs. soft navs on this event.
jest.mock('web-vitals/attribution', () => ({
  onCLS: jest.fn(() => {}),
  onFCP: jest.fn(() => {}),
  onINP: jest.fn(() => {}),
  onLCP: jest.fn((cb) => cb({
    value: 1800,
    navigationType: 'soft-navigation',
    navigationId: 2,
    navigationInteractionId: 42,
    navigationStartTime: 12345,
    attribution: {
      timeToFirstByte: 12,
      resourceLoadDelay: 2,
      resourceLoadDuration: 3,
      elementRenderDelay: 4
    }
  }))
}))

let mainAgent
let timingsAggregate

beforeAll(() => {
  mainAgent = setupAgent()
})

beforeEach(async () => {
  const timingsInstrument = new Timings(mainAgent)
  await new Promise(process.nextTick)
  timingsAggregate = timingsInstrument.featAggregate
  timingsAggregate.ee.emit('rumresp', {})
  await new Promise(resolve => setTimeout(resolve, 100))
})

afterEach(() => {
  resetAgent(mainAgent)
  jest.clearAllMocks()
})

test('soft-nav-scoped LCP report carries navigationType/navigationInteractionId onto the PageViewTiming node', () => {
  const harvestCalls = getHarvestCalls(mainAgent)
  const harvest = harvestCalls.find(call => call.featureName === FEATURE_NAMES.pageViewTiming && call.results.value.payload.body.includes(VITAL_NAMES.LARGEST_CONTENTFUL_PAINT))
  const decodedHarvest = qp.decode(harvest.results.value.payload.body)
  const lcpNode = decodedHarvest.find(tn => tn.name === VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)

  const attr = (name) => lcpNode.attributes.find(a => a.key === name)?.value

  expect(attr('navigationType')).toEqual('soft-navigation')
  expect(attr('navigationInteractionId')).toEqual(42)
  expect(attr('navigationId')).toEqual(2)
  expect(attr('navigationStartTime')).toEqual(12345)
})
