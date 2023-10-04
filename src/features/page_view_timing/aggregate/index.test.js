import * as qp from '@newrelic/nr-querypack'
import { ee } from '../../../common/event-emitter/contextual-ee'
import { Aggregator } from '../../../common/aggregate/aggregator'
import { Aggregate } from '.'
import { getInfo } from '../../../common/config/config'

jest.mock('../../../common/config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn().mockReturnValue(undefined),
  isConfigured: jest.fn().mockReturnValue(true),
  getRuntime: jest.fn().mockReturnValue({}),
  getInfo: jest.fn()
}))

const pvtAgg = new Aggregate('abcd', new Aggregator({ agentIdentifier: 'abcd', ee }))

describe('PVT aggregate', () => {
  test('serializer default attributes', () => {
    const schema = qp.schemas['bel.6']
    getInfo.mockReturnValue({})

    testCases().forEach(testCase => {
      const expectedPayload = qp.encode(testCase.input, schema)
      const payload = pvtAgg.getPayload(getAgentInternalFormat(testCase.input))
      expect(payload).toEqual(expectedPayload)
    })
  })

  test('serializer handles custom attributes', () => {
    // should add custom, should not add cls (reserved)
    getInfo.mockReturnValue({ jsAttributes: { custom: 'val', cls: 'customVal' } })

    testCases().forEach(testCase => {
      const payload = pvtAgg.getPayload(getAgentInternalFormat(testCase.input))
      const events = qp.decode(payload)
      const hasReserved = overriddenReservedAttributes(events)
      const result = haveCustomAttributes(events)
      expect(hasReserved).toEqual(false) // should not allow overridden reserved attribute
      expect(result).toEqual(true) // all events should have the set custom attribute
    })
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
              key: 'fid',
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
              key: 'fid',
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
              key: 'fid',
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
