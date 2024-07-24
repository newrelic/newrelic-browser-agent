/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('../../../tools/jil/driver/browser.js')
const { setup } = require('../utils/setup')

const setupData = setup()
const { baseEE, agentIdentifier, aggregator, nr } = setupData

const { Instrument: AjaxInstrument } = require('../../../src/features/ajax/instrument/index')
const { Instrument: SpaInstrument } = require('../../../src/features/spa/instrument/index')
const { Aggregate: SpaAggregate } = require('../../../src/features/spa/aggregate/index')
new AjaxInstrument(agentIdentifier, aggregator, false)
new SpaInstrument(agentIdentifier, aggregator, false)
let spaAgg
const { wrapTimer } = require('../../../src/common/wrap/index')
const timerEE = wrapTimer(baseEE)
const { drain } = require('../../../src/common/drain/drain')
const { mapOwn } = require('../../../src/common/util/map-own')
const { bundleId } = require('../../../src/common/ids/bundle-id')
const { activateFeatures } = require('../../../src/common/util/feature-flags.js')

var currentNodeId = () => {
  try { return spaAgg.state.currentNode && spaAgg.state.currentNode.id }
  catch (err) { return undefined }
}
var aggregatorLoadQueue = []
var aggregatorLoaded = false
var originalSetTimeout = nr.o.ST

var afterLoad = false
jil.onWindowLoaded(function () {
  afterLoad = true
  originalSetTimeout(function () {
    const { Aggregate: GenericEventsAggregate } = require('../../../src/features/generic_events/aggregate/index')
    new GenericEventsAggregate(agentIdentifier, aggregator)
    if (!spaAgg) spaAgg = new SpaAggregate(agentIdentifier, aggregator)
    drain(agentIdentifier, 'api')
    drain(agentIdentifier, 'feature')
    activateFeatures({sr: 1, st:1, spa:1, ins:1, rum:1, loaded:1}, agentIdentifier)

    aggregatorLoaded = true
    for (var i = 0; i < aggregatorLoadQueue.length; i++) {
      aggregatorLoadQueue[i]()
    }
  })
})

if (afterLoad) {
  originalSetTimeout(function () {
    // emulate load event
    let ev = { type: 'load' }
    let ctx = {}
    baseEE.get('events').emit('fn-start', [[ev], window], ctx)
    baseEE.get('events').emit('fn-end', [[ev], window], ctx)
  })
}

timerEE.on('setTimeout-end', function (args) {
  if (!isEdge()) return
  if (args[0] && args[0][`nr@original:${bundleId}`] && args[0][`nr@original:${bundleId}`].toString().match(/\[native code\]/)) {
    this.method = 'setTimeout (internal)'
  }
})

module.exports = {
  startInteraction,
  simulateClick,
  currentNodeId,
  onWindowLoad,
  InteractionValidator,
  isEdge,
  emitsPopstateEventOnHashChanges,
  onAggregatorLoaded,
  now,
  setupData
}

var lastId = 0

function now () {
  if (typeof performance === 'undefined' || !performance.now) {
    return Date.now()
  }
  return Math.round(performance.now())
}

function onWindowLoad (cb) {
  if (window.addEventListener) {
    window.addEventListener('load', cb, false)
  } else {
    window.attachEvent('onload', cb)
  }
}

function onAggregatorLoaded (cb) {
  if (aggregatorLoaded) return cb()
  aggregatorLoadQueue.push(cb)
}

function emitsPopstateEventOnHashChanges () {
  return (!isEdge() && !isInternetExplorer())
}

function isEdge () {
  return window.navigator.userAgent.match(/Edge\/\d+/)
}

function isInternetExplorer () {
  let userAgent = window.navigator.userAgent
  return userAgent.match(/msie/i) || userAgent.match(/rv:(\d+)/)
}

function startInteraction (onInteractionStart, afterInteractionFinish, options = {}) {
  let interactionId = null
  let done = false
  let eventType = options.eventType || 'click'

  if (eventType === 'initialPageLoad') {
    onInteractionStart(() => { done = true })
  } else if (eventType === 'api') {
    interactionId = lastId++
    options.handle.setAttribute('__interactionId', interactionId)
    onInteractionStart(() => { done = true })
  } else {
    originalSetTimeout(startFromUnwrappedTask, 100)
  }

  baseEE.on('interaction', function (interaction) {
    let id = interaction.root.attrs.custom.__interactionId
    let isInitialPageLoad = eventType === 'initialPageLoad' && interaction.root.attrs.trigger === 'initialPageLoad'
    if (done) {
      if (isInitialPageLoad) {
        afterInteractionFinish(interaction)
      } else if (id === interactionId) {
        delete interaction.root.attrs.custom.__interactionId
        afterInteractionFinish(interaction)
      }
    }
  })

  function startFromUnwrappedTask () {
    switch (eventType) {
      case 'click':
        let el = options.element || document.createElement('div')
        // IE needs the element to be in the DOM in order to allow click events to be
        // captured against it.
        document.body.appendChild(el)
        el.addEventListener('click', handleInteractionEvent)
        simulateClick(el)
        break
      case 'popstate':
        window.addEventListener('popstate', handleInteractionEvent)
        window.history.back()
        break
      case 'keypress':
      case 'keyup':
      case 'keydown':
      case 'change':
        window.addEventListener(eventType, handleInteractionEvent)
        simulateEvent('input', eventType)
        break
      default:
        window.addEventListener(eventType, handleInteractionEvent)
        simulateEvent('div', eventType)
        break
    }

    function handleInteractionEvent (event) {
      interactionId = lastId++
      newrelic.interaction().setAttribute('__interactionId', interactionId)
      event.preventDefault()
      event.stopPropagation()
      onInteractionStart(() => { done = true })
    }
  }
}

function simulateClick (el, ev) {
  let evt = document.createEvent('Events')
  evt.initEvent(ev || 'click', true, false)
  el.dispatchEvent(evt)
}

function simulateEvent (elType, evtType) {
  let el = document.createElement(elType)
  document.body.appendChild(el)
  let evt = document.createEvent('Events')
  evt.initEvent(evtType, true, false)
  el.dispatchEvent(evt)
}

function InteractionValidator (json) {
  this.json = json
  this.count = 0
  this.initialize()
}

var handledKeys = ['attrs', 'children', 'jsTime', 'name', 'type']

let TIMED_NODE_TYPES = [
  'customTracer',
  'interaction',
  'ajax'
]

InteractionValidator.prototype.initialize = function initialize () {
  var validator = this
  validator.count += 2 // end time
  this.forEachNode(null, function count (node) {
    validator.count += 2 // children
    validator.count += 1 // name
    if (node.jsTime) validator.count += 1
    if (node.attrs) validator.count += Object.keys(node.attrs).length
    if (TIMED_NODE_TYPES.indexOf(node.name || node.type) !== -1) validator.count += 5
  })
}

InteractionValidator.prototype.validate = function validate (t, interaction) {
  var root = filterInternal(interaction.root)
  var totalDuration = 0
  var endTime = 0

  this.forEachNode(root, function validateNode (expected, actual) {
    mapOwn(expected, function (key) {
      // mak sure we don't pass because of a typo
      if (handledKeys.indexOf(key) === -1) t.fail('expected unknown key ' + key)
    })

    if (actual.jsTime) totalDuration += actual.jsTime

    if (expected.jsTime) {
      t.ok(actual.jsTime >= expected.jsTime, 'jsTime should be long enough')
    }

    if (expected.attrs) {
      mapOwn(expected.attrs, function (key, val) {
        t.deepEqual(actual.attrs[key], val, key + ' in attrs should match')
      })
    }
    let expectedChildCount = expected.children ? expected.children.length : 0

    t.ok(actual.children, 'node should have children')
    t.equal(actual.type, expected.type || expected.name, 'type should match')
    t.equal(
      actual.children.length,
      expectedChildCount,
      'node should have expected number of children'
    )

    if (TIMED_NODE_TYPES.indexOf(actual.type) !== -1) {
      if (actual.type === 'interaction' && actual.attrs.trigger === 'initialPageLoad') {
        t.equal(actual.start, 0, actual.type + ' node has a zero start time for initial page loads')
      } else {
        t.ok(actual.start, actual.type + ' node has non-zero start time')
      }

      t.ok(actual.end >= actual.start, actual.type + ' node has end time >= start')
      t.ok(actual.jsTime >= 0, actual.type + ' node has a callback time >= 0')
      t.ok(actual.jsEnd >= actual.start, actual.type + ' node has a callback end time >= start')
      t.ok(actual.jsEnd >= (actual.start + actual.jsTime), actual.type + ' jsEnd - jsTime <= start')
      endTime = Math.max(endTime, actual.jsEnd, actual.end)
    }
  })

  t.ok(root.end >= root.start + totalDuration, 'root node should have an end time >= than its start time + all sync js time')
  t.equal(root.end, endTime, 'should have correct end Time')
}

InteractionValidator.prototype.forEachNode = function forEachNode (interactionNode, fn) {
  runNode(this.json, interactionNode)

  function runNode (node, interactionNode) {
    fn(node, interactionNode)
    if (interactionNode) interactionNode.children.sort(byId)
    if (node.children) {
      for (var i = 0; i < node.children.length; ++i) {
        runNode(node.children[i], interactionNode ? interactionNode.children[i] : null)
      }
    }
  }
}

function byId (a, b) {
  return a.id > b.id ? 1 : -1
}

function filterInternal (original) {
  var filtered = {}

  for (var key in original) {
    filtered[key] = original[key]
  }

  filtered.children = filteredChildren(original.children)

  return filtered

  function filteredChildren (children) {
    return children.reduce((list, child) => {
      if (child.type !== 'timer' || child.attrs.method !== 'setTimeout (internal)') {
        return list.concat([filterInternal(child)])
      }

      return list.concat(filteredChildren(child.children))
    }, [])
  }
}
