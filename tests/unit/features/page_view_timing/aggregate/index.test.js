import * as qp from '@newrelic/nr-querypack'
import { Aggregate } from '../../../../../src/features/page_view_timing/aggregate'

const mockRuntime = {
  appMetadata: { agents: [{ entityGuid: '12345' }] }
} // getAddStringContext in the serializer still relies on getRuntime() fn
jest.mock('../../../../../src/common/config/runtime', () => ({
  __esModule: true,
  getRuntime: jest.fn(() => mockRuntime),
  setRuntime: jest.fn()
}))
jest.mock('../../../../../src/common/harvest/harvester')

const pvtAgg = new Aggregate({
  agentIdentifier: 'abcd',
  info: { },
  init: { page_view_timing: {} },
  runtime: mockRuntime
})

pvtAgg.ee.emit('rumresp', [])

describe('PVT aggregate', () => {
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
    global.navigator.connection = {}
    pvtAgg.addTiming('abc', 1)
    expect(pvtAgg.events.get()[0].data[0].attrs).toEqual(expect.objectContaining({}))

    global.navigator.connection.type = 'type'
    pvtAgg.addTiming('abc', 1)
    expect(pvtAgg.events.get()[0].data[1].attrs).toEqual(expect.objectContaining({
      'net-type': 'type'
    }))

    global.navigator.connection.effectiveType = 'effectiveType'
    pvtAgg.addTiming('abc', 1)
    expect(pvtAgg.events.get()[0].data[2].attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType'
    }))

    global.navigator.connection.rtt = 'rtt'
    pvtAgg.addTiming('abc', 1)
    expect(pvtAgg.events.get()[0].data[3].attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt'
    }))

    global.navigator.connection.downlink = 'downlink'
    pvtAgg.addTiming('abc', 1)
    expect(pvtAgg.events.get()[0].data[4].attrs).toEqual(expect.objectContaining({
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
    pvtAgg.addTiming('abc', 1)

    expect(pvtAgg.events.get()[0].data[5].attrs).toEqual(expect.objectContaining({
      'net-type': 'type',
      'net-etype': 'effectiveType',
      'net-rtt': 'rtt',
      'net-dlink': 'downlink'
    }))
    global.navigator.connection = {}
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
          attributes: []
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
          attributes: []
        },
        {
          type: 'timing',
          name: 'fcp',
          value: 305,
          attributes: []
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
