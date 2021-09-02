/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var loader = require('loader')
var registerHandler = require('../../../agent/register-handler')
var harvest = require('../../../agent/harvest')
var HarvestScheduler = require('../../../agent/harvest-scheduler')
var mapOwn = require('map-own')
var reduce = require('reduce')
var stringify = require('../../../agent/stringify')
var slice = require('lodash._slice')
var parseUrl = require('../../xhr/instrument/parse-url')
var supportsPerformanceObserver = require('supports-performance-observer')
var config = require('config')

if (!harvest.xhrUsable || !loader.xhrWrappable) return

var ptid = ''
var ignoredEvents = {mouseup: true, mousedown: true}
var toAggregate = {
  typing: [1000, 2000],
  scrolling: [100, 1000],
  mousing: [1000, 2000],
  touching: [1000, 2000]
}

var rename = {
  typing: {
    keydown: true,
    keyup: true,
    keypress: true
  },
  mousing: {
    mousemove: true,
    mouseenter: true,
    mouseleave: true,
    mouseover: true,
    mouseout: true
  },
  scrolling: {
    scroll: true
  },
  touching: {
    touchstart: true,
    touchmove: true,
    touchend: true,
    touchcancel: true,
    touchenter: true,
    touchleave: true
  }
}

var trace = {}
var nodeCount = 0
var sentTrace = null
var harvestTimeSeconds = config.getConfiguration('stn.harvestTimeSeconds') || 10
var maxNodesPerHarvest = config.getConfiguration('stn.maxNodesPerHarvest') || 1000

var ee = require('ee')

// exports only used for testing
module.exports = {
  _takeSTNs: takeSTNs
}

// Make sure loader.offset is as accurate as possible
require('../../../agent/start-time')

// bail if not instrumented
if (!loader.features.stn) return

ee.on('feat-stn', function () {
  storeTiming(window.performance.timing)

  harvest.on('resources', prepareHarvest)

  var scheduler = new HarvestScheduler(loader, 'resources', { onFinished: onHarvestFinished, retryDelay: harvestTimeSeconds })
  scheduler.runHarvest({ needResponse: true })

  function onHarvestFinished(result) {
    // start timer only if ptid was returned by server
    if (result.sent && result.responseText && !ptid) {
      ptid = result.responseText
      scheduler.startTimer(harvestTimeSeconds)
    }

    if (result.sent && result.retry && sentTrace) {
      mapOwn(sentTrace, function (name, nodes) {
        mergeSTNs(name, nodes)
      })
      sentTrace = null
    }
  }

  function prepareHarvest(options) {
    if ((loader.now()) > (15 * 60 * 1000)) {
      // been collecting for over 15 min, empty trace object and bail
      scheduler.stopTimer()
      trace = {}
      return
    }

    // only send when there are more than 30 nodes to send
    if (ptid && nodeCount <= 30) return

    return takeSTNs(options.retry)
  }

  registerHandler('bst', storeEvent)
  registerHandler('bstTimer', storeTimer)
  registerHandler('bstResource', storeResources)
  registerHandler('bstHist', storeHist)
  registerHandler('bstXhrAgg', storeXhrAgg)
  registerHandler('bstApi', storeSTN)
  registerHandler('errorAgg', storeErrorAgg)
})

function storeTiming (_t) {
  var key
  var val
  var timeOffset
  var now = Date.now()

  // loop iterates through prototype also (for FF)
  for (key in _t) {
    val = _t[key]

    // ignore inherited methods, meaningless 0 values, and bogus timestamps
    // that are in the future (Microsoft Edge seems to sometimes produce these)
    if (!(typeof (val) === 'number' && val > 0 && val < now)) continue

    timeOffset = _t[key] - loader.offset

    storeSTN({
      n: key,
      s: timeOffset,
      e: timeOffset,
      o: 'document',
      t: 'timing'
    })
  }
}

function storeTimer (target, start, end, type) {
  var category = 'timer'
  if (type === 'requestAnimationFrame') category = type

  var evt = {
    n: type,
    s: start,
    e: end,
    o: 'window',
    t: category
  }

  storeSTN(evt)
}

function storeEvent (currentEvent, target, start, end) {
  // we find that certain events make the data too noisy to be useful
  if (currentEvent.type in ignoredEvents) { return false }

  var evt = {
    n: evtName(currentEvent.type),
    s: start,
    e: end,
    t: 'event'
  }

  try {
    // webcomponents-lite.js can trigger an exception on currentEvent.target getter because
    // it does not check currentEvent.currentTarget before calling getRootNode() on it
    evt.o = evtOrigin(currentEvent.target, target)
  } catch (e) {
    evt.o = evtOrigin(null, target)
  }

  storeSTN(evt)
}

function evtName (type) {
  var name = type

  mapOwn(rename, function (key, val) {
    if (type in val) name = key
  })

  return name
}

function evtOrigin (t, target) {
  var origin = 'unknown'

  if (t && t instanceof XMLHttpRequest) {
    var params = ee.context(t).params
    origin = params.status + ' ' + params.method + ': ' + params.host + params.pathname
  } else if (t && typeof (t.tagName) === 'string') {
    origin = t.tagName.toLowerCase()
    if (t.id) origin += '#' + t.id
    if (t.className) origin += '.' + slice(t.classList).join('.')
  }

  if (origin === 'unknown') {
    if (target === document) origin = 'document'
    else if (target === window) origin = 'window'
    else if (target instanceof FileReader) origin = 'FileReader'
  }

  return origin
}

function storeHist (path, old, time) {
  var node = {
    n: 'history.pushState',
    s: time,
    e: time,
    o: path,
    t: old
  }

  storeSTN(node)
}

var laststart = 0

function storeResources (resources) {
  if (!resources || resources.length === 0) return

  resources.forEach(function (currentResource) {
    var parsed = parseUrl(currentResource.name)
    var res = {
      n: currentResource.initiatorType,
      s: currentResource.fetchStart | 0,
      e: currentResource.responseEnd | 0,
      o: parsed.protocol + '://' + parsed.hostname + ':' + parsed.port + parsed.pathname, // resource.name is actually a URL so it's the source
      t: currentResource.entryType
    }

    // don't recollect old resources
    if (res.s <= laststart) return

    storeSTN(res)
  })

  laststart = resources[resources.length - 1].fetchStart | 0
}

function storeErrorAgg (type, name, params, metrics) {
  if (type !== 'err') return
  var node = {
    n: 'error',
    s: metrics.time,
    e: metrics.time,
    o: params.message,
    t: params.stackHash
  }
  storeSTN(node)
}

function storeXhrAgg (type, name, params, metrics) {
  if (type !== 'xhr') return
  var node = {
    n: 'Ajax',
    s: metrics.time,
    e: metrics.time + metrics.duration,
    o: params.status + ' ' + params.method + ': ' + params.host + params.pathname,
    t: 'ajax'
  }
  storeSTN(node)
}

function storeSTN (stn) {
  // limit the number of data that is stored
  if (nodeCount >= maxNodesPerHarvest) return

  var traceArr = trace[stn.n]
  if (!traceArr) traceArr = trace[stn.n] = []

  traceArr.push(stn)
  nodeCount++
}

function mergeSTNs(key, nodes) {
  // limit the number of data that is stored
  if (nodeCount >= maxNodesPerHarvest) return

  var traceArr = trace[key]
  if (!traceArr) traceArr = trace[key] = []

  trace[key] = nodes.concat(traceArr)
  nodeCount += nodes.length
}

function takeSTNs (retry) {
  // if the observer is not being used, this checks resourcetiming buffer every harvest
  if (!supportsPerformanceObserver()) {
    storeResources(window.performance.getEntriesByType('resource'))
  }

  var stns = reduce(mapOwn(trace, function (name, nodes) {
    if (!(name in toAggregate)) return nodes

    return reduce(mapOwn(reduce(nodes.sort(byStart), smearEvtsByOrigin(name), {}), val), flatten, [])
  }), flatten, [])

  if (stns.length === 0) return {}

  if (retry) {
    sentTrace = trace
  }
  trace = {}
  nodeCount = 0

  var stnInfo = {
    qs: {st: '' + loader.offset, ptid: ptid},
    body: {res: stns}
  }

  if (!ptid) {
    stnInfo.qs.ua = loader.info.userAttributes
    stnInfo.qs.at = loader.info.atts
    var ja = stringify(loader.info.jsAttributes)
    stnInfo.qs.ja = ja === '{}' ? null : ja
  }
  return stnInfo
}

function byStart (a, b) {
  return a.s - b.s
}

function smearEvtsByOrigin (name) {
  var maxGap = toAggregate[name][0]
  var maxLen = toAggregate[name][1]
  var lastO = {}

  return function (byOrigin, evt) {
    var lastArr = byOrigin[evt.o]

    lastArr || (lastArr = byOrigin[evt.o] = [])

    var last = lastO[evt.o]

    if (name === 'scrolling' && !trivial(evt)) {
      lastO[evt.o] = null
      evt.n = 'scroll'
      lastArr.push(evt)
    } else if (last && (evt.s - last.s) < maxLen && last.e > (evt.s - maxGap)) {
      last.e = evt.e
    } else {
      lastO[evt.o] = evt
      lastArr.push(evt)
    }

    return byOrigin
  }
}

function val (key, value) {
  return value
}

function flatten (a, b) {
  return a.concat(b)
}

function trivial (node) {
  var limit = 4
  if (node && typeof node.e === 'number' && typeof node.s === 'number' && (node.e - node.s) < limit) return true
  else return false
}
