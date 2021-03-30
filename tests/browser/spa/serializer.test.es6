import jil from 'jil'
import matcher from '../../../tools/jil/util/browser-matcher'

let supported = matcher.withFeature('wrappableAddEventListener')
var qp = require('@datanerd/querypack')
let testCases = require('@datanerd/querypack/examples/all.json').filter((testCase) => {
  return testCase.schema.name === 'bel' &&
    testCase.schema.version === 7 &&
    JSON.parse(testCase.json).length === 1
})

if (process.browser) {
  var serializer = require('../../../feature/spa/aggregate/serializer')
  var Interaction = require('../../../feature/spa/aggregate/Interaction')
  var loader = require('loader')
  loader.info = {}
}

var fieldPropMap = {
  start: 'start',
  end: 'end',
  children: 'children',
  callbackDuration: 'jsTime',
  callbackEnd: 'jsEnd',
  requestBodySize: 'txSize',
  responseBodySize: 'rxSize'
}

_forEach(testCases, function (testCase) {
  jil.browserTest('spa interaction serializer ' + testCase.name, supported, function (t) {
    runTest(testCase, t)
  })
})

jil.browserTest('spa interaction serializer attributes', supported, function (t) {
  let interaction = new Interaction('click', 1459358524622, 'http://example.com/')
  interaction.root.attrs.custom['undefined'] = void 0
  interaction.root.attrs.custom['function'] = function foo (bar) {
    return 123
  }

  var decoded = qp.decode(serializer(interaction.root))[0]
  var attrs = decoded.children.reduce((map, attr) => {
    map[attr.key] = attr
    return map
  }, {})

  // Firefox inserts a "use strict"; as the first line of our test function, so
  // strip it out if present for comparison purposes.
  attrs['function']['value'] = attrs['function']['value'].replace(/"use strict";\n\n/, '')

  t.deepEqual(attrs, {
    'undefined': {
      key: 'undefined',
      type: 'nullAttribute'
    },
    'function': {
      key: 'function',
      type: 'stringAttribute',
      value: 'function foo(bar) {\n    return 123;\n  }'
    }
  }, 'should have expected attributes')
  t.end()
}, 'attributes should be correct')

jil.browserTest('spa interaction serializer attributes', supported, function (t) {
  let interaction = new Interaction('click', 1459358524622, 'http://example.com/')

  for (var i = 1; i < 100; ++i) {
    interaction.root.attrs.custom['attr ' + i] = i
  }

  var decoded = qp.decode(serializer(interaction.root, 0, interaction.root.attrs.trigger === 'initialPageLoad'))[0]
  var attrs = decoded.children.reduce((map, attr) => {
    map[attr.key] = attr
    return map
  }, {})

  t.equal(Object.keys(attrs).length, 64, 'should only have 64 attributes')
  t.end()
}, 'attributes should be limited')

jil.browserTest('spa interaction serializer with undefined string values', supported, function (t) {
  var interaction = new Interaction('click', 1459358524622, 'http://domain/path')
  let decoded = qp.decode(serializer(interaction.root))
  t.equal(decoded[0].customName, null, 'customName (which was undefined originally) should have default value')
  t.end()
})

jil.browserTest('serializing multiple interactions', supported, function(t) {
  var ixn = new Interaction('initialPageLoad', 0, 'http://some-domain')
  addAjaxNode(ixn.root)

  var ixn2 = new Interaction('click', 0, 'http://some-domain')
  ixn2.routeChange = true
  addAjaxNode(ixn2.root)

  var serialized = serializer.serializeMultiple([ixn, ixn2], 0, [])
  let decoded = qp.decode(serialized)

  t.equal(decoded.length, 2, 'there are two root nodes')
  t.equal(decoded[0].type, 'interaction')
  t.equal(decoded[0].children.length, 1, 'first interaction has one child node')
  t.equal(decoded[1].type, 'interaction')
  t.equal(decoded[1].children.length, 1, 'second interaction has one child node')

  t.ok(true)
  t.end()

  function addAjaxNode(parentNode) {
    var ajaxNode = parentNode.child('ajax', null, null, true)
    ajaxNode.attrs.params = {}
    ajaxNode.attrs.metrics = {}
    ajaxNode.finish(100)
    return ajaxNode
  }
})

function runTest (testCase, t) {
  if (!window.JSON) {
    t.skip('skipping querypack test in browser that does not support JSON')
    t.end()
    return
  }

  var schema = testCase.schema
  var inputJSON = JSON.parse(testCase.json)
  var navTiming = []
  var offset = 0

  delete loader.info.atts

  _forEach(inputJSON, function (root) {
    offset = root.start
    mungeInput(root, schema)
  })

  var result = serializer(inputJSON[0], 0, navTiming, inputJSON[0].attrs.category === 'Route change')

  t.equal(result, testCase.querypack, 'agent serializer should produce same output as reference encoder')
  t.end()

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

    var loader = require('loader')
    var typesByName = {}
    _forEach(schema.nodeTypes, function (type) {
      typesByName[type.type] = type
    })

    eachNode(root, function (node) {
      var fields = getAllFields(node.type, typesByName)
      node.attrs = {
        metrics: {},
        params: {}
      }
      node

      _forEach(fields, function (fieldSpec) {
        var prop = fieldPropMap[fieldSpec.name]
        var value = node[fieldSpec.name]

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
          loader.info.queueTime = node.queueTime
        }

        if (fieldSpec.name === 'appTime') {
          loader.info.applicationTime = node.appTime
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
        node.attrs.trigger = node.attrs.trigger
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
    _forEach(tree.children, function (child) {
      eachNode(child, cb)
    })
  }
}

function handleAttributes (node) {
  var allChildren = node.children
  node.children = []

  _forEach(allChildren, function (child) {
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
        loader.info.atts = child.obfuscatedAttributes
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

function _forEach (list, cb) {
  for (var i = 0; i < list.length; i++) {
    cb(list[i])
  }
}

function getAllFields (type, typesByName) {
  var current = typesByName[type]
  if (!current.extends) return current.fields
  return getAllFields(current.extends, typesByName).concat(current.fields)
}
