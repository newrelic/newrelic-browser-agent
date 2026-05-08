/**
 * Regression test: PageViewTiming Web Vitals mis-attributed to wrong route after soft navigation
 *
 * REGRESSION INTRODUCED: v1.312.1 (commit d93f3f38 — "Make soft navigations feature the default SPA")
 *
 * DESCRIPTION:
 *   In a SPA, when a user visits /groceries/pdp and LCP fires (2400ms), that timing event
 *   must be attributed to /groceries/pdp in New Relic (browserTransactionName = "groceries/pdp").
 *
 *   NR's backend derives browserTransactionName from the `ref` query param in the beacon URL.
 *   The harvester builds `ref = cleanURL('' + globalScope.location)` at harvest-send time
 *   (harvester.js: baseQueryString).
 *
 *   If a user navigates from /pdp to /homepage via a soft navigation (SPA route change),
 *   and the LCP event is still buffered when that navigation fires, the next harvest will be
 *   sent with ref=/homepage — silently attributing the /pdp LCP to the wrong route in NRDB.
 *
 * ROOT CAUSE:
 *   The old SPA feature (removed in PR #1638, v1.312.1) called scheduleHarvest(0) on every
 *   interaction completion, flushing all buffered PageViewTiming events synchronously while
 *   window.location still reflected the source route.
 *
 *   The new soft_navigations feature emits a 'newURL' event on every route change, but
 *   page_view_timing/aggregate has no handler for it. Buffered events wait up to 30 seconds
 *   for the periodic harvest — by which point window.location is the destination route.
 *
 * EXPECTED BEHAVIOUR (the fix):
 *   page_view_timing/aggregate must register a 'newURL' handler and call
 *   triggerHarvestFor(this) synchronously on soft navigation, before window.location changes.
 *   This is exactly what the old SPA's scheduleHarvest(0) did.
 *
 * PRODUCTION EVIDENCE (28-lego-prod, 4-day window before vs. after deploying v1.312.1):
 *   Routes users navigate FROM lost 5–10% of PageViewTiming volume:
 *     groceries/pdp:    −742K (−5.6%)   groceries/search: −530K (−6.8%)
 *     groceries/browse: −469K (−9.7%)
 *   Routes users navigate TO gained equivalent volume:
 *     groceries/global-homepage: +632K (+11.5%)   groceries/homepage: +485K (+9.1%)
 *   Total volume was unchanged — pure misattribution, not data loss.
 */

import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as TimingsInstrument } from '../../../src/features/page_view_timing/instrument'
import { getHarvestCalls } from '../../util/basic-checks'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { handle } from '../../../src/common/event-emitter/handle'
import qp from '@newrelic/nr-querypack'
import { VITAL_NAMES } from '../../../src/common/vitals/constants'
// Import the shared VitalMetric instances directly so we can push values into them
// in the same way web-vitals would — this mirrors how the aggregate subscribes to them
import { largestContentfulPaint } from '../../../src/common/vitals/largest-contentful-paint'

// Prevent web-vitals from firing any callbacks automatically during module init
jest.mock('web-vitals/attribution', () => ({
  onCLS: jest.fn(),
  onFCP: jest.fn(),
  onINP: jest.fn(),
  onLCP: jest.fn()
}))

// Named route URLs mirroring real Tesco SPA routes where the bug manifests
const SOURCE_ROUTE = 'http://localhost/groceries/pdp'
const DESTINATION_ROUTE = 'http://localhost/groceries/homepage'

// LCP attribution values matching a realistic /pdp load
const LCP_ATTRIBUTION = {
  timeToFirstByte: 200,
  resourceLoadDelay: 100,
  resourceLoadDuration: 800,
  resourceLoadTime: 800,
  elementRenderDelay: 300,
  lcpEntry: { size: 42000, id: 'hero-image', element: { tagName: 'IMG' } },
  url: SOURCE_ROUTE,
  element: 'img#hero-image'
}

let agent
let timingsInstrument

beforeEach(async () => {
  // Clear LCP history so each test starts with no previous LCP value
  largestContentfulPaint.history.length = 0

  Object.defineProperty(performance, 'getEntriesByType', {
    value: jest.fn().mockReturnValue([]),
    configurable: true,
    writable: true
  })

  agent = setupAgent()
  timingsInstrument = new TimingsInstrument(agent)
  await new Promise(process.nextTick)
  timingsInstrument.featAggregate.ee.emit('rumresp', {})
  // Allow the feature to fully initialise (waitForFlags resolves, drain fires, initial harvest runs)
  await new Promise(resolve => setTimeout(resolve, 100))
})

afterEach(() => {
  resetAgent(agent)
  jest.clearAllMocks()
})

/**
 * THE CORE REGRESSION TEST
 *
 * Timeline being tested:
 *   1. Agent initialises on /pdp — initial drain harvest fires (empty or with early events)
 *   2. LCP fires at ~2400ms — buffered in PageViewTiming, waiting for next 30s harvest
 *   3. User clicks a nav link — soft navigation begins, 'newURL' is emitted
 *   4. EXPECTED (fix): PageViewTiming flushes NOW, while location is still /pdp
 *   5. ACTUAL (bug):   PageViewTiming does nothing; LCP waits for the 30s periodic harvest
 *                      by which point window.location = /homepage → wrong browserTransactionName
 *
 * The test asserts: emitting 'newURL' must trigger an additional PVT harvest.
 * Currently this FAILS — harvest count does not increase on 'newURL'.
 */
test('REGRESSION: emitting newURL (soft navigation /pdp → /homepage) must trigger an immediate PageViewTiming harvest to prevent LCP mis-attribution', () => {
  // Step 1: Simulate LCP firing on /pdp AFTER the initial drain harvest has already run.
  // We push directly into the shared VitalMetric so the aggregate's subscriber receives it
  // — identical to what web-vitals' onLCP callback does in production.
  largestContentfulPaint.update({
    value: 2400,
    attrs: {
      timeToFirstByte: LCP_ATTRIBUTION.timeToFirstByte,
      resourceLoadDelay: LCP_ATTRIBUTION.resourceLoadDelay,
      resourceLoadDuration: LCP_ATTRIBUTION.resourceLoadDuration,
      resourceLoadTime: LCP_ATTRIBUTION.resourceLoadTime,
      elementRenderDelay: LCP_ATTRIBUTION.elementRenderDelay,
      size: LCP_ATTRIBUTION.lcpEntry.size,
      eid: LCP_ATTRIBUTION.lcpEntry.id,
      elTag: LCP_ATTRIBUTION.lcpEntry.element.tagName,
      elUrl: SOURCE_ROUTE
    }
  })

  // Confirm LCP is now buffered in the aggregate (not yet harvested)
  const aggregate = timingsInstrument.featAggregate
  const bufferedLCP = aggregate.events.get()?.find(e => e.name === VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)
  expect(bufferedLCP).toBeDefined()
  expect(bufferedLCP.value).toBe(2400)

  // Step 2: Count PVT harvests before the soft navigation
  const pvtCountBeforeNav = getHarvestCalls(agent)
    .filter(c => c.featureName === FEATURE_NAMES.pageViewTiming).length

  // Step 3: Soft navigation fires — /pdp → /homepage
  // In production: soft_navigations/instrument emits 'newURL' synchronously when
  // history.pushState is called. window.location then reflects the new route.
  // The PageViewTiming aggregate MUST flush HERE, while location is still /pdp.
  handle('newURL', [performance.now(), DESTINATION_ROUTE], undefined, FEATURE_NAMES.pageViewTiming, agent.ee)
  // From this point, any harvest will have ref = DESTINATION_ROUTE (/homepage)

  // Step 4: THE FAILING ASSERTION — demonstrates the bug
  //
  //   EXPECTED: harvest count increased (flush happened on 'newURL' while ref=/pdp)
  //   ACTUAL:   harvest count unchanged (no 'newURL' handler → LCP will be sent with ref=/homepage)
  const pvtCountAfterNav = getHarvestCalls(agent)
    .filter(c => c.featureName === FEATURE_NAMES.pageViewTiming).length

  expect(pvtCountAfterNav).toBeGreaterThan(pvtCountBeforeNav)
})

/**
 * PASSING COMPANION: correct LCP payload when harvest fires while still on /pdp
 *
 * This confirms that when a harvest IS triggered on /pdp (either by the fix responding
 * to 'newURL', or by the existing periodic timer before any navigation), the resulting
 * payload carries the correct LCP value (2400ms) and attribution attributes.
 *
 * This test passes today and must continue to pass after the fix.
 */
test('when harvest fires while still on /pdp, LCP payload carries the correct value (2400ms) and attribution', () => {
  // Simulate LCP firing on /pdp
  largestContentfulPaint.update({
    value: 2400,
    attrs: {
      timeToFirstByte: LCP_ATTRIBUTION.timeToFirstByte,
      resourceLoadDelay: LCP_ATTRIBUTION.resourceLoadDelay,
      resourceLoadDuration: LCP_ATTRIBUTION.resourceLoadDuration,
      resourceLoadTime: LCP_ATTRIBUTION.resourceLoadTime,
      elementRenderDelay: LCP_ATTRIBUTION.elementRenderDelay,
      size: LCP_ATTRIBUTION.lcpEntry.size,
      eid: LCP_ATTRIBUTION.lcpEntry.id,
      elTag: LCP_ATTRIBUTION.lcpEntry.element.tagName,
      elUrl: SOURCE_ROUTE
    }
  })

  // Trigger harvest manually — this is what the fix will do automatically on 'newURL'
  agent.runtime.harvester.triggerHarvestFor(timingsInstrument.featAggregate)

  const harvestCalls = getHarvestCalls(agent)
  const lcpHarvest = harvestCalls.find(call =>
    call.featureName === FEATURE_NAMES.pageViewTiming &&
    call.results.value?.payload?.body?.includes(VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)
  )

  expect(lcpHarvest).toBeDefined()

  const decoded = qp.decode(lcpHarvest.results.value.payload.body)
  const lcpNode = decoded.find(n => n.name === VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)

  expect(lcpNode).toBeDefined()
  expect(lcpNode.value).toBe(2400)
  expect(lcpNode.type).toBe('timing')

  const getAttr = (key) => lcpNode.attributes.find(a => a.key === key)?.value
  expect(getAttr('timeToFirstByte')).toBe(200)
  expect(getAttr('elTag')).toBe('IMG')
  expect(getAttr('size')).toBe(42000)
  expect(getAttr('elUrl')).toContain('/pdp')
})
