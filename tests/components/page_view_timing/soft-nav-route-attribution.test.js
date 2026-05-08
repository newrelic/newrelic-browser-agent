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
 *   (harvester.js: baseQueryString → send → xhr({ url: fullUrl })).
 *
 *   If a user navigates from /pdp to /homepage via a soft navigation (SPA route change),
 *   and the LCP event is still buffered when that navigation fires, window.location is already
 *   /homepage when the harvest eventually sends — so the beacon carries ref=/homepage, and NR
 *   attributes the LCP to groceries/homepage (wrong browserTransactionName).
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
 * THE TEST:
 *   We spy on the xhr submitMethod to capture the actual beacon URL (fullUrl) — the same URL
 *   NR's collector receives. We parse the `ref` query param from it, which is exactly what
 *   NR's backend uses to derive browserTransactionName.
 *
 *   EXPECTED: ref contains /groceries/pdp  (source route — where LCP was captured)
 *   ACTUAL:   ref contains /groceries/homepage (destination — window.location at harvest time)
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
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { handle } from '../../../src/common/event-emitter/handle'
import { VITAL_NAMES } from '../../../src/common/vitals/constants'
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

let agent
let timingsInstrument
// Captures all URLs passed to XMLHttpRequest.prototype.open — the actual beacon URLs
// NR's collector receives, including the `ref` param used for browserTransactionName.
const beaconUrls = []

beforeEach(async () => {
  largestContentfulPaint.history.length = 0
  beaconUrls.length = 0

  Object.defineProperty(performance, 'getEntriesByType', {
    value: jest.fn().mockReturnValue([]),
    configurable: true,
    writable: true
  })

  Object.defineProperty(window, 'location', {
    value: new URL(SOURCE_ROUTE),
    writable: true,
    configurable: true
  })

  // Intercept XMLHttpRequest.prototype.open to capture beacon URLs.
  // This is the deepest interception point — it works regardless of module binding,
  // and captures exactly what NR's collector receives.
  const originalOpen = XMLHttpRequest.prototype.open
  jest.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (method, url, ...rest) {
    beaconUrls.push(url)
    return originalOpen.call(this, method, url, ...rest)
  })

  agent = setupAgent()
  timingsInstrument = new TimingsInstrument(agent)
  await new Promise(process.nextTick)
  timingsInstrument.featAggregate.ee.emit('rumresp', {})
  await new Promise(resolve => setTimeout(resolve, 100))
})

afterEach(() => {
  resetAgent(agent)
  jest.restoreAllMocks()
})

/**
 * Helper: parse the `ref` query param from a beacon URL.
 * `ref` is the URL-encoded page location that NR's backend maps to browserTransactionName.
 */
function extractRefFromBeaconUrl (url) {
  const params = new URLSearchParams(url.split('?')[1])
  return decodeURIComponent(params.get('ref') || '')
}

/**
 * Helper: find the PVT beacon URL from captured XHR calls.
 * PVT goes to the 'events' endpoint — the URL contains '/events/1/'.
 * We find the last such URL (most recent harvest call for PVT).
 */
function findPVTBeaconUrl () {
  // All PVT harvests go to the /events/ endpoint
  return beaconUrls.filter(url => url?.includes('/events/')).at(-1)
}

/**
 * THE CORE REGRESSION TEST
 *
 * Scenario:
 *   1. User is on /groceries/pdp. LCP fires (2400ms) and is buffered.
 *   2. User navigates to /groceries/homepage (soft nav). window.location changes.
 *   3. Harvest eventually fires with window.location = /homepage.
 *
 * EXPECTED: the beacon URL for the LCP event contains ref=/groceries/pdp
 * ACTUAL (bug): the beacon URL contains ref=/groceries/homepage
 *
 * This causes NR to attribute the /pdp LCP under browserTransactionName "groceries/homepage".
 */
test('REGRESSION: LCP captured on /groceries/pdp is sent with ref=/groceries/homepage after soft navigation, causing wrong browserTransactionName in New Relic', () => {
  // Step 1: LCP fires on /pdp and is buffered (window.location is still SOURCE_ROUTE here)
  largestContentfulPaint.update({
    value: 2400,
    attrs: {
      timeToFirstByte: 200,
      resourceLoadDelay: 100,
      resourceLoadDuration: 800,
      resourceLoadTime: 800,
      elementRenderDelay: 300,
      size: 42000,
      eid: 'hero-image',
      elTag: 'IMG',
      elUrl: SOURCE_ROUTE
    }
  })

  // Confirm LCP is buffered, not yet sent
  const bufferedLCP = timingsInstrument.featAggregate.events.get()
    ?.find(e => e.name === VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)
  expect(bufferedLCP).toBeDefined()
  expect(bufferedLCP.value).toBe(2400)

  // Step 2: User navigates to /homepage. window.location now reflects DESTINATION_ROUTE.
  window.location = new URL(DESTINATION_ROUTE)
  handle('newURL', [performance.now(), DESTINATION_ROUTE], undefined, FEATURE_NAMES.pageViewTiming, agent.ee)

  // Step 3: Harvest fires (simulating the 30-second periodic tick after the navigation)
  agent.runtime.harvester.triggerHarvestFor(timingsInstrument.featAggregate)

  // Step 4: Assert on the `ref` in the PVT beacon URL.
  // `ref` is what NR's backend uses to derive browserTransactionName.
  const beaconUrl = findPVTBeaconUrl()
  expect(beaconUrl).toBeDefined()

  const ref = extractRefFromBeaconUrl(beaconUrl)

  // THE FAILING ASSERTION — this is the bug:
  // The LCP from /pdp was sent AFTER location changed to /homepage, so ref=/homepage.
  // NR's backend attributes this event to browserTransactionName "groceries/homepage".
  //
  // EXPECTED (correct): ref must identify the SOURCE route where LCP was captured
  expect(ref).toContain('/groceries/pdp')

  // ACTUAL (bug demonstrated when this fails):
  // ref = http://localhost/groceries/homepage — the destination route
})

/**
 * PASSING COMPANION: when harvest fires before navigation, ref correctly identifies the source route
 *
 * This is the CORRECT behaviour. It passes today and must continue to pass after the fix.
 * The fix will make the regression test above also pass by ensuring harvest fires before location changes.
 */
test('when harvest fires while still on /groceries/pdp, ref in beacon correctly identifies /pdp', () => {
  // LCP fires on /pdp
  largestContentfulPaint.update({
    value: 2400,
    attrs: {
      timeToFirstByte: 200,
      resourceLoadDelay: 100,
      resourceLoadDuration: 800,
      resourceLoadTime: 800,
      elementRenderDelay: 300,
      size: 42000,
      eid: 'hero-image',
      elTag: 'IMG',
      elUrl: SOURCE_ROUTE
    }
  })

  // Harvest fires BEFORE any navigation (window.location is still /pdp)
  agent.runtime.harvester.triggerHarvestFor(timingsInstrument.featAggregate)

  const beaconUrl = findPVTBeaconUrl()
  expect(beaconUrl).toBeDefined()

  const ref = extractRefFromBeaconUrl(beaconUrl)

  // ref correctly identifies the source route — NR will attribute to "groceries/pdp"
  expect(ref).toContain('/groceries/pdp')
  expect(ref).not.toContain('/groceries/homepage')
})
