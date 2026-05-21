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
