/* eslint-disable no-void */
import * as qp from '@newrelic/nr-querypack'
import { Serializer } from '../../../src/features/spa/aggregate/serializer'
import { Interaction } from '../../../src/features/spa/aggregate/interaction'
import * as infoModule from '../../../src/common/config/info'
import { Obfuscator } from '../../../src/common/util/obfuscate'

const testCases = require('@newrelic/nr-querypack/examples/all.json').filter((testCase) => {
  return testCase.schema.name === 'bel' &&
    testCase.schema.version === 7 &&
    JSON.parse(testCase.json).length === 1
})
let mockInfo = {}
jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/config/info', () => ({
  __esModule: true,
  getInfo: jest.fn(() => mockInfo),
  setInfo: jest.fn((_id, newInfo) => { mockInfo = newInfo })
}))
jest.mock('../../../src/common/config/init', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn()
}))

const agentIdentifier = 'abcdefg'
const serializer = new Serializer({
  agentIdentifier,
  runtime: { obfuscator: new Obfuscator({ init: { obfuscate: [] } }) }
})

const fieldPropMap = {
  start: 'start',
  end: 'end',
  children: 'children',
  callbackDuration: 'jsTime',
  callbackEnd: 'jsEnd',
  requestBodySize: 'txSize',
  responseBodySize: 'rxSize'
}

testCases.forEach(testCase => {
  test('spa serializer ' + testCase.name, () => {
    runTest(testCase)
  })
})

test('spa serializer attributes', () => {
  const interaction = new Interaction('click', 1459358524622, 'http://example.com/', undefined, undefined, agentIdentifier)
  interaction.root.attrs.custom.undefined = void 0
  interaction.root.attrs.custom.function = function foo (bar) {
    return 123
  }

  const decoded = qp.decode(serializer.serializeSingle(interaction.root))[0]
  const attrs = decoded.children.reduce((map, attr) => {
    map[attr.key] = attr
    return map
  }, {})

  // Firefox inserts a "use strict"; as the first line of our test function, so
  // strip it out if present for comparison purposes.
  attrs.function.value = attrs.function.value.replace(/"use strict";\n\n/, '')

  expect(attrs).toEqual({
    undefined: {
      key: 'undefined',
      type: 'nullAttribute'
    },
    function: {
      key: 'function',
      type: 'stringAttribute',
      value: 'function foo(bar) {\n    return 123;\n  }'
    }
  })
})

test('spa interaction serializer attributes', () => {
  const interaction = new Interaction('click', 1459358524622, 'http://example.com/', undefined, undefined, agentIdentifier)

  for (let i = 1; i < 100; ++i) {
    interaction.root.attrs.custom['attr ' + i] = i
  }

  const decoded = qp.decode(serializer.serializeSingle(interaction.root, 0, interaction.root.attrs.trigger === 'initialPageLoad'))[0]
  const attrs = decoded.children.reduce((map, attr) => {
    map[attr.key] = attr
    return map
  }, {})

  expect(Object.keys(attrs).length).toEqual(64)
})

test('spa interaction serializer with undefined string values', () => {
  const interaction = new Interaction('click', 1459358524622, 'http://domain/path', undefined, undefined, agentIdentifier)
  const decoded = qp.decode(serializer.serializeSingle(interaction.root))
  expect(decoded[0].customName).toBeNull()
})

test('serializing multiple interactions', () => {
  const ixn = new Interaction('initialPageLoad', 0, 'http://some-domain', undefined, undefined, agentIdentifier)
  addAjaxNode(ixn.root)

  const ixn2 = new Interaction('click', 0, 'http://some-domain', undefined, undefined, agentIdentifier)
  ixn2.routeChange = true
  addAjaxNode(ixn2.root)

  const serialized = serializer.serializeMultiple([ixn, ixn2], 0, [])
  const decoded = qp.decode(serialized)

  expect(decoded.length).toEqual(2)
  expect(decoded[0].type).toEqual('interaction')
  expect(decoded[0].children.length).toEqual(1)
  expect(decoded[1].type).toEqual('interaction')
  expect(decoded[1].children.length).toEqual(1)

  function addAjaxNode (parentNode) {
    const ajaxNode = parentNode.child('ajax', null, null, true)
    ajaxNode.attrs.params = {}
    ajaxNode.attrs.metrics = {}
    ajaxNode.finish(100)
    return ajaxNode
  }
})

function runTest (testCase) {
  const schema = testCase.schema
  const inputJSON = JSON.parse(testCase.json)
  const navTiming = []
  let offset = 0

  delete infoModule.getInfo(agentIdentifier).atts

  inputJSON.forEach(function (root) {
    offset = root.start
    mungeInput(root, schema)
  })

  const result = serializer.serializeSingle(inputJSON[0], 0, navTiming, inputJSON[0].attrs.category === 'Route change')

  expect(result).toEqual(testCase.querypack) // agent serializer should produce same output as reference encoder

  // Transform the flat JSON input data from the Querypack repo into the object format
  // produced by the agent.
  function mungeInput (root, schema) {
    if (root.guid && root.traceId && root.timestamp) {
      root.dt = {
        spanId: root.guid,
        traceId: root.traceId,
        timestamp: root.timestamp
      }
    }

    const info = infoModule.getInfo(agentIdentifier)

    const typesByName = {}
    schema.nodeTypes.forEach(type => (typesByName[type.type] = type))

    eachNode(root, function (node) {
      const fields = getAllFields(node.type, typesByName)
      node.attrs = {
        metrics: {},
        params: {}
      }

      fields.forEach(function (fieldSpec) {
        const prop = fieldPropMap[fieldSpec.name]
        const value = node[fieldSpec.name]

        if (fieldSpec.name === 'requestBodySize') {
          node.attrs.metrics[prop] = value
        }

        if (fieldSpec.name === 'responseBodySize') {
          node.attrs.metrics[prop] = value
        }

        if (fieldSpec.name === 'method') {
          node.attrs.params.method = node.method
        }

        if (fieldSpec.name === 'status') {
          node.attrs.params.status = node.status
        }

        if (fieldSpec.name === 'domain') {
          node.attrs.params.host = node.domain
        }

        if (fieldSpec.name === 'path') {
          node.attrs.params.pathname = node.path
        }

        if (fieldSpec.name === 'requestedWith') {
          node.attrs.isFetch = node.requestedWith === 'fetch'
        }

        if (fieldSpec.name === 'navTiming' && node.navTiming) {
          navTiming.push(0)
          navTiming.push(node.navTiming.unloadEventStart ? node.navTiming.unloadEventStart - offset : void 0)
          navTiming.push(node.navTiming.redirectStart ? node.navTiming.redirectStart - offset : void 0)
          navTiming.push(node.navTiming.unloadEventEnd ? node.navTiming.unloadEventEnd - offset : void 0)
          navTiming.push(node.navTiming.redirectEnd ? node.navTiming.redirectEnd - offset : void 0)
          navTiming.push(node.navTiming.fetchStart ? node.navTiming.fetchStart - offset : void 0)
          navTiming.push(node.navTiming.domainLookupStart ? node.navTiming.domainLookupStart - offset : void 0)
          navTiming.push(node.navTiming.domainLookupEnd ? node.navTiming.domainLookupEnd - offset : void 0)
          navTiming.push(node.navTiming.connectStart ? node.navTiming.connectStart - offset : void 0)
          navTiming.push(node.navTiming.secureConnectionStart ? node.navTiming.secureConnectionStart - offset : void 0)
          navTiming.push(node.navTiming.connectEnd ? node.navTiming.connectEnd - offset : void 0)
          navTiming.push(node.navTiming.requestStart ? node.navTiming.requestStart - offset : void 0)
          navTiming.push(node.navTiming.responseStart ? node.navTiming.responseStart - offset : void 0)
          navTiming.push(node.navTiming.responseEnd ? node.navTiming.responseEnd - offset : void 0)
          navTiming.push(node.navTiming.domLoading ? node.navTiming.domLoading - offset : void 0)
          navTiming.push(node.navTiming.domInteractive ? node.navTiming.domInteractive - offset : void 0)
          navTiming.push(node.navTiming.domContentLoadedEventStart ? node.navTiming.domContentLoadedEventStart - offset : void 0)
          navTiming.push(node.navTiming.domContentLoadedEventEnd ? node.navTiming.domContentLoadedEventEnd - offset : void 0)
          navTiming.push(node.navTiming.domComplete ? node.navTiming.domComplete - offset : void 0)
          navTiming.push(node.navTiming.loadEventStart ? node.navTiming.loadEventStart - offset : void 0)
          navTiming.push(node.navTiming.loadEventEnd ? node.navTiming.loadEventEnd - offset : void 0)
        }

        if (fieldSpec.name === 'queueTime') {
          info.queueTime = node.queueTime
        }

        if (fieldSpec.name === 'appTime') {
          info.applicationTime = node.appTime
        }

        if (fieldSpec.name === 'tracedCallbackDuration') {
          node.attrs.tracedTime = node.tracedCallbackDuration
        }

        if (fieldSpec.name === 'previousRouteName') {
          node.attrs.oldRoute = node.previousRouteName
        }

        if (fieldSpec.name === 'targetRouteName') {
          node.attrs.newRoute = node.targetRouteName
        }

        delete node[fieldSpec.name]
        if (prop) node[prop] = value
        else node.attrs[fieldSpec.name] = value
      })

      if (node.type === 'interaction') {
        node.attrs.custom = {}
        handleAttributes(node)
      }

      if (node.attrs.nodeId) {
        node.id = node.attrs.nodeId
        delete node.attrs.nodeId
      }

      if (!node.children) node.children = []
    })
  }

  function eachNode (tree, cb) {
    cb(tree)
    if (!tree.children) return
    tree.children.forEach(child => eachNode(child, cb))
  }
}

function handleAttributes (node) {
  var allChildren = node.children
  node.children = []

  allChildren.forEach(function (child) {
    switch (child.type) {
      case 'doubleAttribute':
      case 'stringAttribute':
        node.attrs.custom[child.key] = child.value
        break
      case 'trueAttribute':
        node.attrs.custom[child.key] = true
        break
      case 'falseAttribute':
        node.attrs.custom[child.key] = false
        break
      case 'nullAttribute':
        node.attrs.custom[child.key] = null
        break
      case 'apmAttributes':
        infoModule.getInfo(agentIdentifier).atts = child.obfuscatedAttributes
        break
      case 'elementData':
        node.attrs.elementData = child
        break
      case 'customEnd':
        node.children.push({
          type: 'customEnd',
          start: child.time,
          end: child.time,
          children: []
        })
        break
      default:
        node.children.push(child)
    }
  })
}

function getAllFields (type, typesByName) {
  const current = typesByName[type]
  if (!current.extends) return current.fields
  return getAllFields(current.extends, typesByName).concat(current.fields)
}
