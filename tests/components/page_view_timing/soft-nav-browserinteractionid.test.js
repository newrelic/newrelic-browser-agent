import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as Timings } from '../../../src/features/page_view_timing/instrument'
import { Instrument as SoftNav } from '../../../src/features/soft_navigations/instrument'
import { Harvester } from '../../../src/common/harvest/harvester'
import { largestContentfulPaint } from '../../../src/common/vitals/largest-contentful-paint'
import { VITAL_NAMES } from '../../../src/common/vitals/constants'

// POC (soft-nav spike, hybrid): end-to-end proof that soft_navigations' #handlePvtAdded listener actually mutates
// the same attrs object page_view_timing stored on its own buffered PageViewTiming node -- not just that the
// 'pvtAdded' event fires, but that the *specific node this test can see* ends up carrying browserInteractionId.
// Both features are wired to the same agent/event-emitter here, unlike the isolated soft_navigations component
// test which simulates the 'pvtAdded' payload by hand.

let mainAgent

beforeAll(() => {
  mainAgent = setupAgent({
    init: {
      soft_navigations: { enabled: true }
    }
  })
  jest.spyOn(Harvester.prototype, 'triggerHarvestFor').mockImplementation(() => ({ ranSend: false }))
  jest.spyOn(Harvester.prototype, 'startTimer').mockImplementation(() => {})
})

let timingsAggregate
let softNavAggregate

beforeEach(async () => {
  const timingsInstrument = new Timings(mainAgent)
  await new Promise(process.nextTick)
  timingsAggregate = timingsInstrument.featAggregate
  timingsAggregate.ee.emit('rumresp', {})

  const softNavInstrument = new SoftNav(mainAgent)
  await softNavInstrument.onAggregateImported
  softNavAggregate = softNavInstrument.featAggregate
  softNavAggregate.ee.emit('rumresp', [{ spa: 1 }])

  await new Promise(resolve => setTimeout(resolve, 100))
})

afterEach(() => {
  if (softNavAggregate?.interactionInProgress) {
    clearTimeout(softNavAggregate.interactionInProgress.cancellationTimer)
    clearTimeout(softNavAggregate.interactionInProgress.watchLongtaskTimer)
  }
  resetAgent(mainAgent)
  jest.clearAllMocks()
})

test('a soft-nav-scoped LCP node in page_view_timing ends up carrying browserInteractionId from soft_navigations', () => {
  // Drive a route-change interaction into an active (pending-finish) state, same as soft_navigations' own tests.
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  softNavAggregate.ee.emit('newURL', [200, 'new_location'])
  softNavAggregate.ee.emit('newDom', [300])
  const ixn = softNavAggregate.interactionInProgress
  expect(ixn).toBeTruthy()

  // Fire a real soft-nav-scoped LCP report through the shared VitalMetric singleton -- this is what triggers
  // BOTH page_view_timing's addTiming()/handle('pvtAdded', ...) AND soft_navigations' direct subscription.
  largestContentfulPaint.update({
    value: 1800,
    attrs: { navigationType: 'soft-navigation', navigationStartTime: 250 }
  })

  const lcpNode = timingsAggregate.events.get().find(tn => tn.name === VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)
  expect(lcpNode).toBeTruthy()
  expect(lcpNode.attrs.browserInteractionId).toEqual(ixn.id)
})
