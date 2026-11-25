import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as SoftNav } from '../../../src/features/soft_navigations/instrument'
import { Harvester } from '../../../src/common/harvest/harvester'
import * as loadTimeModule from '../../../src/common/vitals/load-time'
import { largestContentfulPaint } from '../../../src/common/vitals/largest-contentful-paint'
import { softNavApiSupported } from '../../../src/common/vitals/soft-navigation-support'
import { INTERACTION_STATUS } from '../../../src/features/soft_navigations/constants'

// POC (soft-nav spike): coverage for attaching interaction-scoped web-vitals metrics onto the BrowserInteraction
// (soft_navigations) that produced them -- see #attachSoftNavVital in src/features/soft_navigations/aggregate/index.js.

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

let softNavAggregate

beforeEach(async () => {
  jest.spyOn(loadTimeModule.loadTime, 'subscribe')

  const softNavInstrument = new SoftNav(mainAgent)
  await softNavInstrument.onAggregateImported
  softNavAggregate = softNavInstrument.featAggregate

  softNavAggregate.ee.emit('rumresp', [{ spa: 1 }])
  await new Promise(process.nextTick)
})

afterEach(() => {
  if (softNavAggregate?.interactionInProgress) {
    clearTimeout(softNavAggregate.interactionInProgress.cancellationTimer)
    clearTimeout(softNavAggregate.interactionInProgress.watchLongtaskTimer)
  }
  resetAgent(mainAgent)
  jest.clearAllMocks()
  softNavAggregate = null
})

test('stamps softNavApiSupported onto every new interaction using the real capability check', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  // jsdom doesn't implement the experimental `soft-navigation` PerformanceObserver entry type, so the real,
  // unmocked capability check is expected to resolve false in this test environment -- this assertion would
  // also catch a regression where the constructor stops reading the live capability module at all.
  expect(softNavAggregate.interactionInProgress.customAttributes.softNavApiSupported).toBe(softNavApiSupported)
  expect(softNavApiSupported).toBe(false)
})

test('attaches interactionLCP to the active interaction for a soft-nav-scoped LCP report', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  softNavAggregate.ee.emit('newURL', [200, 'new_location'])
  softNavAggregate.ee.emit('newDom', [300])
  const ixn = softNavAggregate.interactionInProgress
  expect(ixn.status).toEqual(INTERACTION_STATUS.PF) // active for getInteractionFor lookups even before fully finished

  largestContentfulPaint.update({
    value: 1800,
    attrs: { navigationType: 'soft-navigation', navigationStartTime: 250 } // falls within [100, current) the ixn's active span
  })

  expect(ixn.customAttributes.interactionLCP).toEqual(1800)
})

test('ignores vitals that are not soft-nav-scoped (no navigationType)', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  const ixn = softNavAggregate.interactionInProgress
  const reportSpy = jest.spyOn(softNavAggregate, 'reportSupportabilityMetric')

  largestContentfulPaint.update({ value: 1800, attrs: {} }) // ordinary hard-nav LCP report, no navigationType

  expect(ixn.customAttributes.interactionLCP).toBeUndefined()
  expect(reportSpy).not.toHaveBeenCalled()
})

test('reports a supportability metric when a soft-nav vital cannot be attributed to any interaction', () => {
  const reportSpy = jest.spyOn(softNavAggregate, 'reportSupportabilityMetric')

  // No interaction is active at all at this point (initial page load hasn't been closed, no UI event fired),
  // and the timestamp given is arbitrarily far in the past, so no interaction can be matched.
  largestContentfulPaint.update({
    value: 1800,
    attrs: { navigationType: 'soft-navigation', navigationStartTime: -1 }
  })

  expect(reportSpy).toHaveBeenCalledWith('SoftNav/Vital/interactionLCP/Unattributed')
})

test('reports a supportability metric when a soft-nav vital is missing navigationStartTime', () => {
  const reportSpy = jest.spyOn(softNavAggregate, 'reportSupportabilityMetric')

  largestContentfulPaint.update({
    value: 1800,
    attrs: { navigationType: 'soft-navigation' } // navigationStartTime omitted
  })

  expect(reportSpy).toHaveBeenCalledWith('SoftNav/Vital/interactionLCP/MissingStartTime')
})

test('treats navigationStartTime of 0 the same as missing, not as a valid timestamp', () => {
  // web-vitals' initMetric() defaults navigationStartTime to 0 rather than leaving it undefined when no real
  // value was supplied -- a plain `typeof !== 'number'` guard would incorrectly treat that default as usable.
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  const ixn = softNavAggregate.interactionInProgress
  const reportSpy = jest.spyOn(softNavAggregate, 'reportSupportabilityMetric')

  largestContentfulPaint.update({
    value: 1800,
    attrs: { navigationType: 'soft-navigation', navigationStartTime: 0 }
  })

  expect(ixn.customAttributes.interactionLCP).toBeUndefined()
  expect(reportSpy).toHaveBeenCalledWith('SoftNav/Vital/interactionLCP/MissingStartTime')
})

test('reports a supportability metric (but still attributes the vital) when navigationURL does not match the interaction', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  softNavAggregate.ee.emit('newURL', [200, 'http://localhost/dashboard'])
  softNavAggregate.ee.emit('newDom', [300])
  const ixn = softNavAggregate.interactionInProgress
  expect(ixn.newURL).toEqual('http://localhost/dashboard')
  const reportSpy = jest.spyOn(softNavAggregate, 'reportSupportabilityMetric')

  largestContentfulPaint.update({
    value: 1800,
    attrs: { navigationType: 'soft-navigation', navigationStartTime: 250, navigationURL: 'http://localhost/settings' }
  })

  // A URL mismatch is telemetry, not a hard gate -- the timestamp-based match still wins so a normalization
  // difference between entry.name and interaction.newURL can't turn a good attribution into a false negative.
  expect(ixn.customAttributes.interactionLCP).toEqual(1800)
  expect(reportSpy).toHaveBeenCalledWith('SoftNav/Vital/interactionLCP/UrlMismatch')
})

test('does not report a UrlMismatch when navigationURL matches the interaction (after cleaning query/hash)', () => {
  softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
  softNavAggregate.ee.emit('newURL', [200, 'http://localhost/dashboard?tab=2#section'])
  softNavAggregate.ee.emit('newDom', [300])
  const ixn = softNavAggregate.interactionInProgress
  const reportSpy = jest.spyOn(softNavAggregate, 'reportSupportabilityMetric')

  largestContentfulPaint.update({
    value: 1800,
    // navigationURL is already cleaned (no query/hash) by the time it reaches here, per the vitals wrapper
    attrs: { navigationType: 'soft-navigation', navigationStartTime: 250, navigationURL: 'http://localhost/dashboard' }
  })

  expect(ixn.customAttributes.interactionLCP).toEqual(1800)
  expect(reportSpy).not.toHaveBeenCalledWith(expect.stringContaining('UrlMismatch'))
})

// POC (soft-nav spike, hybrid): coverage for #handlePvtAdded, the second listener that stamps browserInteractionId
// directly onto a PageViewTiming node by mutating the same attrs object reference page_view_timing already emits
// on 'pvtAdded' -- see the method's JSDoc in aggregate/index.js for why this is additive to #attachSoftNavVital,
// not a replacement.
describe('pvtAdded (PageViewTiming browserInteractionId stamping)', () => {
  test('waits for the interaction to finish before mutating the shared attrs object with browserInteractionId', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    softNavAggregate.ee.emit('newURL', [200, 'new_location'])
    softNavAggregate.ee.emit('newDom', [300])
    const ixn = softNavAggregate.interactionInProgress
    expect(ixn.status).toEqual(INTERACTION_STATUS.PF)

    // This is exactly the shape page_view_timing's addTiming() emits: handle('pvtAdded', [name, value, attrs], ...)
    const attrs = { navigationType: 'soft-navigation', navigationStartTime: 250 }
    softNavAggregate.ee.emit('pvtAdded', ['lcp', 1800, attrs])

    // Same wait/release discipline as ajax/jserror correlation: not stamped yet while still pending-finish,
    // since this interaction could still end up cancelled.
    expect(attrs.browserInteractionId).toBeUndefined()

    ixn.done()
    expect(ixn.status).toEqual(INTERACTION_STATUS.FIN)
    expect(attrs.browserInteractionId).toEqual(ixn.id)
  })

  test('attaches browserInteractionId immediately when the interaction has already finished', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    softNavAggregate.ee.emit('newURL', [200, 'new_location'])
    softNavAggregate.ee.emit('newDom', [300])
    const ixn = softNavAggregate.interactionInProgress
    ixn.done()
    expect(ixn.status).toEqual(INTERACTION_STATUS.FIN)

    const attrs = { navigationType: 'soft-navigation', navigationStartTime: 250 }
    softNavAggregate.ee.emit('pvtAdded', ['lcp', 1800, attrs])

    expect(attrs.browserInteractionId).toEqual(ixn.id)
  })

  test('never stamps browserInteractionId if the interaction is cancelled instead of finished', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])
    const ixn = softNavAggregate.interactionInProgress
    expect(ixn.status).toEqual(INTERACTION_STATUS.IP)

    const attrs = { navigationType: 'soft-navigation', navigationStartTime: 250 }
    softNavAggregate.ee.emit('pvtAdded', ['lcp', 1800, attrs])
    expect(attrs.browserInteractionId).toBeUndefined()

    // Cancel it -- the hard click->URL->DOM sequence never completed, so it never meets the finish criteria and
    // a competing UI event replaces/cancels it instead.
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 110 }])
    expect(ixn.status).toEqual(INTERACTION_STATUS.CAN)

    // Would be a corrupt reference if set: this interaction is never harvested/sent as a BrowserInteraction event.
    expect(attrs.browserInteractionId).toBeUndefined()
  })

  test('does not stamp browserInteractionId for a hard-nav (non soft-nav) PVT node', () => {
    softNavAggregate.ee.emit('newUIEvent', [{ type: 'keydown', timeStamp: 100 }])

    const attrs = { pageUrl: 'http://localhost/' } // no navigationType -- ordinary hard-nav timing node
    softNavAggregate.ee.emit('pvtAdded', ['lcp', 1800, attrs])

    expect(attrs.browserInteractionId).toBeUndefined()
  })

  test('leaves attrs untouched when no interaction can be matched', () => {
    // No interaction active at all, and a timestamp with nothing to match.
    const attrs = { navigationType: 'soft-navigation', navigationStartTime: -1 }
    softNavAggregate.ee.emit('pvtAdded', ['cls', 0.12, attrs])

    expect(attrs.browserInteractionId).toBeUndefined()
  })

  test('never reports supportability metrics on failure, to avoid double-counting #attachSoftNavVital\'s reporting for the same underlying vital update', () => {
    const reportSpy = jest.spyOn(softNavAggregate, 'reportSupportabilityMetric')

    // Neither of these attribute-resolution failures should report anything via the pvtAdded path.
    softNavAggregate.ee.emit('pvtAdded', ['lcp', 1800, { navigationType: 'soft-navigation' }]) // missing navigationStartTime
    softNavAggregate.ee.emit('pvtAdded', ['lcp', 1800, { navigationType: 'soft-navigation', navigationStartTime: -1 }]) // unattributed

    expect(reportSpy).not.toHaveBeenCalled()
  })
})
