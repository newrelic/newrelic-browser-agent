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
