import * as qp from '@newrelic/nr-querypack'
import { Aggregate } from '../../../../../src/features/page_view_timing/aggregate'
import { ee } from '../../../../../src/common/event-emitter/contextual-ee'

jest.mock('../../../../../src/common/harvest/harvester')
jest.mock('../../../../../src/common/util/webdriver-detection', () => ({
  webdriverDetected: false
}))
jest.mock('../../../../../src/common/constants/runtime', () => ({
  ...jest.requireActual('../../../../../src/common/constants/runtime'),
  getNavigationEntry: () => ({ name: 'https://example.com/test-page?query=value#hash' })
}))

const agentIdentifier = 'abcd'
const agentInst = {
  agentIdentifier,
  ee: ee.get(agentIdentifier),
  info: {},
  init: { page_view_timing: {} },
  runtime: {
    jsAttributesMetadata: { bytes: 0 }
  }
}
const pvtAgg = new Aggregate(agentInst)

describe('PVT aggregate', () => {
  beforeEach(() => {
    // Clear jsAttributes before each test to ensure clean state
    pvtAgg.agentRef.info.jsAttributes = {}
  })

  test('serializer default attributes', () => {
    const schema = qp.schemas['bel.6']

    testCases().forEach(testCase => {
      const expectedPayload = qp.encode(testCase.input, schema)
      const payload = pvtAgg.serializer(getAgentInternalFormat(testCase.input))
      expect(payload).toEqual(expectedPayload)
    })
  })

  test('serializer handles custom attributes', () => {
    // should add custom, should not add cls (reserved)
    pvtAgg.agentRef.info.jsAttributes = { custom: 'val', cls: 'customVal' }

    testCases().forEach(testCase => {
      const payload = pvtAgg.serializer(getAgentInternalFormat(testCase.input))
      const events = qp.decode(payload)
      const hasReserved = overriddenReservedAttributes(events)
      const result = haveCustomAttributes(events)
      expect(hasReserved).toEqual(false) // should not allow overridden reserved attribute
      expect(result).toEqual(true) // all events should have the set custom attribute
    })
  })

  test('addConnectionAttributes', () => {
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
    global.navigator.connection = {}
    pvtAgg.addTiming('abc', 1)
    expect(pvtAgg.events.get()[0].attrs).toEqual(expect.objectContaining({}))

    global.navigator.connection.type = 'type'
    let timing = pvtAgg.addTiming('abc', 1)
    expect(timing.attrs).toEqual(expect.objectContaining({
      'net-type': 'type'
    }))

    global.navigator.connection.effectiveType = 'effectiveType'
    timing = pvtAgg.addTiming('abc', 1)
    expect(timing.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType'
    }))

    global.navigator.connection.rtt = 'rtt'
    timing = pvtAgg.addTiming('abc', 1)
    expect(timing.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt'
    }))

    global.navigator.connection.downlink = 'downlink'
    timing = pvtAgg.addTiming('abc', 1)
    expect(timing.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt',
      'net-dlink': 'downlink'
    }))

    global.navigator.connection = {
      type: 'type',
      effectiveType: 'effectiveType',
      rtt: 'rtt',
      downlink: 'downlink'
    }
    timing = pvtAgg.addTiming('abc', 1)

    expect(timing.attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt',
      'net-dlink': 'downlink'
    }))
    global.navigator.connection = {}
  })

  test('all timings have pageUrl attribute set to initial navigation URL, even after soft navigation', () => {
    const timing1 = pvtAgg.addTiming('fp', 100)
    const timing2 = pvtAgg.addTiming('fcp', 200)

    // Verify initial timings have the cleaned initial page URL
    expect(timing1.attrs.pageUrl).toBe('https://example.com/test-page')
    expect(timing2.attrs.pageUrl).toBe('https://example.com/test-page')

    // Simulate a soft navigation (SPA route change) by changing window.location
    // Note: getNavigationEntry() returns the FIRST navigation entry, which never changes even when location changes in SPA
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/new-spa-route' },
      writable: true,
      configurable: true
    })

    const timing3 = pvtAgg.addTiming('lcp', 300, { size: 1000, eid: 'hero-image' })
    const timing4 = pvtAgg.addTiming('cls', 0.05)
    const timing5 = pvtAgg.addTiming('pageHide', 5000)

    // All timings should still have the INITIAL page URL, not the new SPA route
    expect(timing3.attrs.pageUrl).toBe('https://example.com/test-page')
    expect(timing4.attrs.pageUrl).toBe('https://example.com/test-page')
    expect(timing5.attrs.pageUrl).toBe('https://example.com/test-page')
  })

  /**
   * Regression test for: PageViewTiming events mis-attributed to wrong browserTransactionName after soft navigation
   *
   * ROOT CAUSE (introduced in v1.312.1 / PR #1638 "Make soft navigations feature the default SPA"):
   *   The old SPA feature called `scheduler.scheduleHarvest(0)` (an immediate harvest) every time an
   *   interaction completed. This flushed all buffered PageViewTiming events while `window.location`
   *   still reflected the SOURCE route, so NR's backend received `ref=<source-route>` and correctly
   *   attributed events to that route's `browserTransactionName`.
   *
   *   The new soft_navigations feature does NOT trigger an immediate PVT harvest on route change.
   *   Events collected on route A stay buffered until the next 30-second harvest interval, by which
   *   time the user is on route B. `baseQueryString()` in harvester.js builds the beacon URL with
   *   `ref = cleanURL('' + globalScope.location)` — the CURRENT location at send time — so all
   *   route A events are sent with `ref=<route-B-url>` and land under the wrong browserTransactionName.
   *
   * SYMPTOM in NR (account 3512954 / 28-lego-prod):
   *   - `groceries:80/pdp`, `groceries:80/search`, `groceries:80/browse` lost ~5-10% of PageViewTiming volume
   *   - `groceries:80/homepage`, `groceries:80/global-homepage` gained equivalent volume
   *   - This exactly matches the navigation pattern: users browsing pdp/search navigate TO homepage/global-homepage
   *
   * FIX: PageViewTiming aggregate must listen for `newURL` (the soft navigation event emitted by
   * soft_navigations/instrument) and immediately trigger a harvest flush via
   * `this.agentRef.runtime.harvester.triggerHarvestFor(this)` before `globalScope.location` updates.
   */
  test('REGRESSION: triggers immediate harvest flush on soft navigation URL change to prevent browserTransactionName mis-attribution', () => {
    // performance.getEntriesByType is called by checkForFirstInteraction inside addTiming
    Object.defineProperty(performance, 'getEntriesByType', {
      value: jest.fn().mockReturnValue([]),
      configurable: true,
      writable: true
    })

    // Create a fresh aggregate with a mocked harvester so we can spy on harvest calls
    const freshId = 'soft-nav-regression-test'
    const mockTriggerHarvestFor = jest.fn()
    const freshAgentInst = {
      agentIdentifier: freshId,
      ee: ee.get(freshId),
      info: {},
      init: { page_view_timing: {} },
      runtime: {
        jsAttributesMetadata: { bytes: 0 },
        harvester: { triggerHarvestFor: mockTriggerHarvestFor }
      }
    }
    const freshAgg = new Aggregate(freshAgentInst)

    // Simulate: user lands on /pdp, Web Vitals are collected and buffered
    freshAgg.addTiming('fp', 800)
    freshAgg.addTiming('fcp', 1200)
    freshAgg.addTiming('lcp', 2500)

    // Sanity: no harvest should have been triggered yet (events are just buffered)
    expect(mockTriggerHarvestFor).not.toHaveBeenCalled()

    // Simulate: soft navigation fires — user navigates from /pdp to /homepage
    // The soft_navigations instrument emits 'newURL' just as window.location changes.
    // PVT MUST flush before location changes so that events are sent with ref=/pdp.
    const { handle } = require('../../../../../src/common/event-emitter/handle')
    handle('newURL', [performance.now(), 'https://groceries.tesco.com/homepage'], undefined, 'page_view_timing', freshAgg.ee)

    // CURRENTLY FAILS: PVT aggregate does not listen for newURL and does not flush.
    // The fix should make this assertion pass: harvest was triggered while location was still /pdp.
    expect(mockTriggerHarvestFor).toHaveBeenCalledTimes(1)
    expect(mockTriggerHarvestFor).toHaveBeenCalledWith(freshAgg)

    jest.restoreAllMocks()
  })
})

function testCases () {
  return [
    {
      name: 'single node',
      input: [
        {
          type: 'timing',
          name: 'fp',
          value: 123,
          attributes: [
            {
              type: 'falseAttribute',
              key: 'webdriverDetected'
            }
          ]
        }
      ]
    },
    {
      name: 'single node with one attribute',
      input: [
        {
          type: 'timing',
          name: 'fp',
          value: 123,
          attributes: [
            {
              type: 'stringAttribute',
              key: 'eventType',
              value: 'click'
            },
            {
              type: 'falseAttribute',
              key: 'webdriverDetected'
            }
          ]
        }
      ]
    },
    {
      name: 'single lcp node with multiple attributes',
      input: [
        {
          type: 'timing',
          name: 'lcp',
          value: 256,
          attributes: [
            {
              type: 'doubleAttribute',
              key: 'size',
              value: 600.32
            },
            {
              type: 'stringAttribute',
              key: 'eid',
              value: 'header-image'
            },
            {
              type: 'falseAttribute',
              key: 'webdriverDetected'
            }
          ]
        }
      ]
    },
    {
      name: 'single node with multiple attributes',
      input: [
        {
          type: 'timing',
          name: 'fp',
          value: 123,
          attributes: [
            {
              type: 'stringAttribute',
              key: 'eventType',
              value: 'click'
            },
            {
              type: 'doubleAttribute',
              key: 'foo',
              value: 12.34
            },
            {
              type: 'falseAttribute',
              key: 'webdriverDetected'
            }
          ]
        }
      ]
    },
    {
      name: 'multiple nodes',
      input: [
        {
          type: 'timing',
          name: 'fp',
          value: 35,
          attributes: [
            {
              type: 'falseAttribute',
              key: 'webdriverDetected'
            }
          ]
        },
        {
          type: 'timing',
          name: 'fcp',
          value: 305,
          attributes: [
            {
              type: 'falseAttribute',
              key: 'webdriverDetected'
            }
          ]
        }
      ]
    },
    {
      name: 'multiple nodes with attributes',
      input: [
        {
          type: 'timing',
          name: 'fp',
          value: 35,
          attributes: [
            {
              type: 'stringAttribute',
              key: 'eventType',
              value: 'click'
            },
            {
              type: 'doubleAttribute',
              key: 'foo',
              value: 12.34
            },
            {
              type: 'falseAttribute',
              key: 'webdriverDetected'
            }
          ]
        },
        {
          type: 'timing',
          name: 'fcp',
          value: 305,
          attributes: [
            {
              type: 'stringAttribute',
              key: 'eventType',
              value: 'click'
            },
            {
              type: 'doubleAttribute',
              key: 'foo',
              value: 12.34
            },
            {
              type: 'falseAttribute',
              key: 'webdriverDetected'
            }
          ]
        }
      ]
    },
    {
      name: 'more than 9 attributes',
      input: [
        {
          type: 'timing',
          name: 'fcp',
          value: 305,
          attributes: [
            {
              type: 'stringAttribute',
              key: 'attr1',
              value: '1'
            },
            {
              type: 'stringAttribute',
              key: 'attr2',
              value: '1'
            },
            {
              type: 'stringAttribute',
              key: 'attr3',
              value: '1'
            },
            {
              type: 'stringAttribute',
              key: 'attr4',
              value: '1'
            },
            {
              type: 'stringAttribute',
              key: 'attr5',
              value: '1'
            },
            {
              type: 'stringAttribute',
              key: 'attr6',
              value: '1'
            },
            {
              type: 'stringAttribute',
              key: 'attr7',
              value: '1'
            },
            {
              type: 'stringAttribute',
              key: 'attr8',
              value: '1'
            },
            {
              type: 'stringAttribute',
              key: 'attr9',
              value: '1'
            },
            {
              type: 'stringAttribute',
              key: 'attr10',
              value: '1'
            },
            {
              type: 'falseAttribute',
              key: 'webdriverDetected'
            }
          ]
        }
      ]
    }
  ]
}

// The querypack encoder/decoder represents the JSON decoded values in the format
// as they are defined in the test cases (using arrays of objects).
// In the agent, however, we store timing attributes as a map.
function getAgentInternalFormat (inputInQueryPackDecodedFormat) {
  var agentFormat = JSON.parse(JSON.stringify(inputInQueryPackDecodedFormat))
  agentFormat.forEach(timingNode => {
    timingNode.attrs = {}
    timingNode.attributes.forEach(attr => {
      timingNode.attrs[attr.key] = attr.value
    })
    delete timingNode.attributes
  })
  return agentFormat
}
function haveCustomAttributes (timings) {
  return timings.every(timing => {
    return timing.attributes.some(attr => {
      return attr.key === 'custom' && attr.value === 'val'
    })
  })
}
function overriddenReservedAttributes (timings) {
  return timings.some(timing => {
    return timing.attributes.some(attr => {
      return attr.key === 'cls' && attr.value === 'customVal'
    })
  })
}
