/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { mapOwn } from '../../../common/util/map-own'
import { reduce } from '../../../common/util/reduce'
import { stringify } from '../../../common/util/stringify'
import { parseUrl } from '../../../common/url/parse-url'
import { supportsPerformanceObserver } from '../../../common/window/supports-performance-observer'
import slice from 'lodash._slice'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { now } from '../../../common/timing/now'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'
import { drain } from '../../../common/drain/drain'
import { HandlerCache } from '../../utils/handler-cache'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    // Very unlikely, but in case the existing XMLHttpRequest.prototype object on the page couldn't be wrapped.
    if (!getRuntime(agentIdentifier).xhrWrappable) return

    const handlerCache = new HandlerCache()
    this.ptid = ''
    this.ignoredEvents = {
      // we find that certain events make the data too noisy to be useful
      global: { mouseup: true, mousedown: true },
      // certain events are present both in the window and in PVT metrics.  PVT metrics are prefered so the window events should be ignored
      window: { load: true, pagehide: true },
      // when ajax instrumentation is disabled, all XMLHttpRequest events will return with origin = xhrOriginMissing and should be ignored
      xhrOriginMissing: { ignoreAll: true }
    }
    this.toAggregate = {
      typing: [1000, 2000],
      scrolling: [100, 1000],
      mousing: [1000, 2000],
      touching: [1000, 2000]
    }
    this.rename = {
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

    this.trace = {}
    this.nodeCount = 0
    this.sentTrace = null
    this.harvestTimeSeconds = getConfigurationValue(agentIdentifier, 'session_trace.harvestTimeSeconds') || 10
    this.maxNodesPerHarvest = getConfigurationValue(agentIdentifier, 'session_trace.maxNodesPerHarvest') || 1000

    this.laststart = 0

    registerHandler('feat-stn', () => {
      this.storeTiming(window.performance.timing)

      var scheduler = new HarvestScheduler('resources', {
        onFinished: onHarvestFinished.bind(this),
        retryDelay: this.harvestTimeSeconds
      }, this)
      scheduler.harvest.on('resources', prepareHarvest.bind(this))
      scheduler.runHarvest({ needResponse: true }) // sends first stn harvest immediately

      function onHarvestFinished (result) {
        // start timer only if ptid was returned by server
        if (result.sent && result.responseText && !this.ptid) {
          this.ptid = result.responseText
          getRuntime(this.agentIdentifier).ptid = this.ptid
          scheduler.startTimer(this.harvestTimeSeconds)
        }

        if (result.sent && result.retry && this.sentTrace) {
          mapOwn(this.sentTrace, (name, nodes) => {
            this.mergeSTNs(name, nodes)
          })
          this.sentTrace = null
        }
      }

      function prepareHarvest (options) {
        if ((now()) > (15 * 60 * 1000)) {
          // been collecting for over 15 min, empty trace object and bail
          scheduler.stopTimer()
          this.trace = {}
          return
        }

        // only send when there are more than 30 nodes to send
        if (this.ptid && this.nodeCount <= 30) return

        return this.takeSTNs(options.retry)
      }
      handlerCache.decide(true)
    }, this.featureName, this.ee)

    registerHandler('block-stn', () => {
      handlerCache.decide(false)
    }, this.featureName, this.ee)

    // register the handlers immediately... but let the handlerCache decide if the data should actually get stored...
    registerHandler('bst', (...args) => handlerCache.settle(() => this.storeEvent(...args)), this.featureName, this.ee)
    registerHandler('bstTimer', (...args) => handlerCache.settle(() => this.storeTimer(...args)), this.featureName, this.ee)
    registerHandler('bstResource', (...args) => handlerCache.settle(() => this.storeResources(...args)), this.featureName, this.ee)
    registerHandler('bstHist', (...args) => handlerCache.settle(() => this.storeHist(...args)), this.featureName, this.ee)
    registerHandler('bstXhrAgg', (...args) => handlerCache.settle(() => this.storeXhrAgg(...args)), this.featureName, this.ee)
    registerHandler('bstApi', (...args) => handlerCache.settle(() => this.storeSTN(...args)), this.featureName, this.ee)
    registerHandler('errorAgg', (...args) => handlerCache.settle(() => this.storeErrorAgg(...args)), this.featureName, this.ee)
    registerHandler('pvtAdded', (...args) => handlerCache.settle(() => this.processPVT(...args)), this.featureName, this.ee)
    drain(this.agentIdentifier, this.featureName)
  }

  processPVT (name, value, attrs) {
    var t = {}
    t[name] = value
    this.storeTiming(t, true)
    if (this.hasFID(name, attrs)) this.storeEvent({ type: 'fid', target: 'document' }, 'document', value, value + attrs.fid)
  }

  storeTiming (_t, ignoreOffset) {
    var key
    var val
    var timeOffset
    var dateNow = Date.now()

    // loop iterates through prototype also (for FF)
    for (key in _t) {
      val = _t[key]

      // ignore inherited methods, meaningless 0 values, and bogus timestamps
      // that are in the future (Microsoft Edge seems to sometimes produce these)
      if (!(typeof (val) === 'number' && val > 0 && val < dateNow)) continue

      timeOffset = !ignoreOffset ? _t[key] - getRuntime(this.agentIdentifier).offset : _t[key]

      this.storeSTN({
        n: key,
        s: timeOffset,
        e: timeOffset,
        o: 'document',
        t: 'timing'
      })
    }
  }

  storeTimer (target, start, end, type) {
    var category = 'timer'
    if (type === 'requestAnimationFrame') category = type

    var evt = {
      n: type,
      s: start,
      e: end,
      o: 'window',
      t: category
    }

    this.storeSTN(evt)
  }

  storeEvent (currentEvent, target, start, end) {
    if (this.shouldIgnoreEvent(currentEvent, target)) return false

    var evt = {
      n: this.evtName(currentEvent.type),
      s: start,
      e: end,
      t: 'event'
    }

    try {
      // webcomponents-lite.js can trigger an exception on currentEvent.target getter because
      // it does not check currentEvent.currentTarget before calling getRootNode() on it
      evt.o = this.evtOrigin(currentEvent.target, target)
    } catch (e) {
      evt.o = this.evtOrigin(null, target)
    }

    this.storeSTN(evt)
  }

  evtName (type) {
    var name = type

    mapOwn(this.rename, function (key, val) {
      if (type in val) name = key
    })

    return name
  }

  evtOrigin (t, target) {
    var origin = 'unknown'

    if (t && t instanceof XMLHttpRequest) {
      var params = this.ee.context(t).params
      if (!params || !params.status || !params.method || !params.host || !params.pathname) return 'xhrOriginMissing'
      origin = params.status + ' ' + params.method + ': ' + params.host + params.pathname
    } else if (t && typeof (t.tagName) === 'string') {
      origin = t.tagName.toLowerCase()
      if (t.id) origin += '#' + t.id
      if (t.className) origin += '.' + slice(t.classList).join('.')
    }

    if (origin === 'unknown') {
      if (typeof target === 'string') origin = target
      else if (target === document) origin = 'document'
      else if (target === window) origin = 'window'
      else if (target instanceof FileReader) origin = 'FileReader'
    }

    return origin
  }

  storeHist (path, old, time) {
    var node = {
      n: 'history.pushState',
      s: time,
      e: time,
      o: path,
      t: old
    }

    this.storeSTN(node)
  }

  storeResources (resources) {
    if (!resources || resources.length === 0) return

    resources.forEach((currentResource) => {
      var parsed = parseUrl(currentResource.name)
      var res = {
        n: currentResource.initiatorType,
        s: currentResource.fetchStart | 0,
        e: currentResource.responseEnd | 0,
        o: parsed.protocol + '://' + parsed.hostname + ':' + parsed.port + parsed.pathname, // resource.name is actually a URL so it's the source
        t: currentResource.entryType
      }

      // don't recollect old resources
      if (res.s <= this.laststart) return

      this.storeSTN(res)
    })

    this.laststart = resources[resources.length - 1].fetchStart | 0
  }

  storeErrorAgg (type, name, params, metrics) {
    if (type !== 'err') return
    var node = {
      n: 'error',
      s: metrics.time,
      e: metrics.time,
      o: params.message,
      t: params.stackHash
    }
    this.storeSTN(node)
  }

  storeXhrAgg (type, name, params, metrics) {
    if (type !== 'xhr') return
    var node = {
      n: 'Ajax',
      s: metrics.time,
      e: metrics.time + metrics.duration,
      o: params.status + ' ' + params.method + ': ' + params.host + params.pathname,
      t: 'ajax'
    }
    this.storeSTN(node)
  }

  storeSTN (stn) {
    // limit the number of data that is stored
    if (this.nodeCount >= this.maxNodesPerHarvest) return

    var traceArr = this.trace[stn.n]
    if (!traceArr) traceArr = this.trace[stn.n] = []

    traceArr.push(stn)
    this.nodeCount++
  }

  mergeSTNs (key, nodes) {
    // limit the number of data that is stored
    if (this.nodeCount >= this.maxNodesPerHarvest) return

    var traceArr = this.trace[key]
    if (!traceArr) traceArr = this.trace[key] = []

    this.trace[key] = nodes.concat(traceArr)
    this.nodeCount += nodes.length
  }

  takeSTNs (retry) {
    // if the observer is not being used, this checks resourcetiming buffer every harvest
    if (!supportsPerformanceObserver()) {
      this.storeResources(window.performance.getEntriesByType('resource'))
    }

    var stns = reduce(mapOwn(this.trace, (name, nodes) => {
      if (!(name in this.toAggregate)) return nodes

      return reduce(mapOwn(reduce(nodes.sort(this.byStart), this.smearEvtsByOrigin(name), {}), this.val), this.flatten, [])
    }), this.flatten, [])

    if (stns.length === 0) return {}

    if (retry) {
      this.sentTrace = this.trace
    }
    this.trace = {}
    this.nodeCount = 0

    var stnInfo = {
      qs: { st: '' + getRuntime(this.agentIdentifier).offset },
      body: { res: stns }
    }

    if (!this.ptid) {
      const { userAttributes, atts, jsAttributes } = getInfo(this.agentIdentifier)
      stnInfo.qs.ua = userAttributes
      stnInfo.qs.at = atts
      var ja = stringify(jsAttributes)
      stnInfo.qs.ja = ja === '{}' ? null : ja
    }
    return stnInfo
  }

  byStart (a, b) {
    return a.s - b.s
  }

  smearEvtsByOrigin (name) {
    var maxGap = this.toAggregate[name][0]
    var maxLen = this.toAggregate[name][1]
    var lastO = {}

    return (byOrigin, evt) => {
      var lastArr = byOrigin[evt.o]

      lastArr || (lastArr = byOrigin[evt.o] = [])

      var last = lastO[evt.o]

      if (name === 'scrolling' && !this.trivial(evt)) {
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

  val (key, value) {
    return value
  }

  flatten (a, b) {
    return a.concat(b)
  }

  hasFID (name, attrs) {
    return name === 'fi' && !!attrs && typeof attrs.fid === 'number'
  }

  trivial (node) {
    var limit = 4
    if (node && typeof node.e === 'number' && typeof node.s === 'number' && (node.e - node.s) < limit) return true
    else return false
  }

  shouldIgnoreEvent (event, target) {
    var origin = this.evtOrigin(event.target, target)
    if (event.type in this.ignoredEvents.global) return true
    if (!!this.ignoredEvents[origin] && this.ignoredEvents[origin].ignoreAll) return true
    if (!!this.ignoredEvents[origin] && event.type in this.ignoredEvents[origin]) return true
    return false
  }
}
