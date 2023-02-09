/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

var qp = require('@newrelic/nr-querypack')

if (process.browser) {
  let helpers = require('./spa/helpers')
  var loaded = false
  helpers.onWindowLoad(() => {
    loaded = true
  })
}

var testCases = [
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

// The querypack encoder/decoder represents the JSON decoded values in the format
// as they are defined in the test cases (using arrays of objects).
// In the agent, however, we store timing attributes as a map.
function getAgentInternalFormat (inputInQueryPackDecodedFormat) {
  var agentFormat = JSON.parse(JSON.stringify(inputInQueryPackDecodedFormat))
  agentFormat.forEach((timingNode) => {
    timingNode.attrs = {}
    timingNode.attributes.forEach((attr) => {
      timingNode.attrs[attr.key] = attr.value
    })
    delete timingNode.attributes
  })
  return agentFormat
}

function haveCustomAttributes (timings) {
  return timings.every((timing) => {
    return timing.attributes.some((attr) => {
      return attr.key === 'custom' && attr.value === 'val'
    })
  })
}

function overriddenReservedAttributes (timings) {
  return timings.some((timing) => {
    return timing.attributes.some((attr) => {
      return attr.key === 'cls' && attr.value === 'customVal'
    })
  })
}

function waitForWindowLoad (fn) {
  if (loaded) {
    fn()
  } else {
    setTimeout(waitForWindowLoad, 100, fn)
  }
}

const { setup } = require('./utils/setup')
const { setInfo } = require('../../src/common/config/config')
const { Aggregate: PvtAggregate } = require('../../src/features/page_view_timing/aggregate/index')

const { agentIdentifier, aggregator } = setup()

jil.browserTest('page-view-timing serializer default attributes', function (t) {
  const pvtAgg = new PvtAggregate(agentIdentifier, aggregator)

  var schema = qp.schemas['bel.6']

  waitForWindowLoad(startTest)

  function startTest () {
    testCases.forEach((testCase) => {
      var expectedPayload = qp.encode(testCase.input, schema)
      var payload = pvtAgg.getPayload(getAgentInternalFormat(testCase.input))
      t.equal(payload, expectedPayload, testCase.name)
    })

    t.end()
  }
})

jil.browserTest('page-view-timing serializer handles custom attributes', function (t) {
  const pvtAgg = new PvtAggregate(agentIdentifier, aggregator)

  waitForWindowLoad(startTest)

  function startTest () {
    // should add custom, should not add cls (reserved)
    setInfo(agentIdentifier, {
      jsAttributes: { custom: 'val', cls: 'customVal' }
    })

    testCases.forEach((testCase) => {
      var payload = pvtAgg.getPayload(getAgentInternalFormat(testCase.input))
      var events = qp.decode(payload)
      var hasReserved = overriddenReservedAttributes(events)
      var result = haveCustomAttributes(events)
      t.notOk(hasReserved, 'should not allow overridden reserved attribute')
      t.ok(result, 'all events should have the set custom attribute')
    })

    t.end()
  }
})
