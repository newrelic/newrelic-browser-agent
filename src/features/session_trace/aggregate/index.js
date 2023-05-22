/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { stringify } from '../../../common/util/stringify'
import { parseUrl } from '../../../common/url/parse-url'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { now } from '../../../common/timing/now'
import { FEATURE_NAME } from '../constants'
import { drain } from '../../../common/drain/drain'
import { HandlerCache } from '../../utils/handler-cache'
import { FeatureBase } from '../../utils/feature-base'

const ignoredEvents = {
  // we find that certain events make the data too noisy to be useful
  global: { mouseup: true, mousedown: true },
  // certain events are present both in the window and in PVT metrics.  PVT metrics are prefered so the window events should be ignored
  window: { load: true, pagehide: true },
  // when ajax instrumentation is disabled, all XMLHttpRequest events will return with origin = xhrOriginMissing and should be ignored
  xhrOriginMissing: { ignoreAll: true }
}
const toAggregate = {
  typing: [1000, 2000],
  scrolling: [100, 1000],
  mousing: [1000, 2000],
  touching: [1000, 2000]
}
const MAX_TRACE_DURATION = 15 * 60 * 1000 // 15 minutes

export class Aggregate extends FeatureBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, argsObj) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    // Very unlikely, but in case the existing XMLHttpRequest.prototype object on the page couldn't be wrapped.
    if (!getRuntime(agentIdentifier).xhrWrappable) return

    this.resourceObserver = argsObj?.resourceObserver // undefined if observer couldn't be created
    this.ptid = ''
    this.trace = {}
    this.nodeCount = 0
    this.sentTrace = null
    this.harvestTimeSeconds = getConfigurationValue(agentIdentifier, 'session_trace.harvestTimeSeconds') || 10
    this.maxNodesPerHarvest = getConfigurationValue(agentIdentifier, 'session_trace.maxNodesPerHarvest') || 1000
    this.laststart = 0

    const handlerCache = new HandlerCache()

    registerHandler('feat-stn', () => {
      if (typeof PerformanceNavigationTiming !== 'undefined') {
        this.storeTiming(window.performance.getEntriesByType('navigation')[0])
      } else {
        this.storeTiming(window.performance.timing)
      }

      const scheduler = new HarvestScheduler('resources', {
        onFinished: onHarvestFinished.bind(this),
        retryDelay: this.harvestTimeSeconds
      }, this)
      scheduler.harvest.on('resources', prepareHarvest.bind(this))
      scheduler.runHarvest({ needResponse: true }) // sends first stn harvest immediately
      handlerCache.decide(true)

      function onHarvestFinished (result) {
        if (result.sent && result.responseText && !this.ptid) { // continue interval harvest only if ptid was returned by server on the first
          getRuntime(this.agentIdentifier).ptid = this.ptid = result.responseText
          scheduler.startTimer(this.harvestTimeSeconds)
        }

        if (result.sent && result.retry && this.sentTrace) { // merge previous trace back into buffer to retry for next harvest
          Object.entries(this.sentTrace).forEach(([name, listOfSTNodes]) => {
            if (this.nodeCount >= this.maxNodesPerHarvest) return

            this.nodeCount += listOfSTNodes.length
            this.trace[name] = this.trace[name] ? listOfSTNodes.concat(this.trace[name]) : listOfSTNodes
          })
          this.sentTrace = null
        }
      }
      function prepareHarvest (options) {
        if (now() > MAX_TRACE_DURATION) { // been collecting for over 15 min, empty trace object and bail
          scheduler.stopTimer()
          this.trace = {}
          return
        }
        // Only harvest when there are more than 30 nodes to send after the very first.
        if (this.ptid && this.nodeCount <= 30) return

        return this.takeSTNs(options.retry)
      }
    }, this.featureName, this.ee)

    registerHandler('block-stn', () => handlerCache.decide(false), this.featureName, this.ee)

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

  // PageViewTiming (FEATURE) events and metrics, such as 'load', 'lcp', etc. pipes into ST here.
  processPVT (name, value, attrs) {
    this.storeTiming({ [name]: value })
    if (hasFID(name, attrs)) this.storeEvent({ type: 'fid', target: 'document' }, 'document', value, value + attrs.fid)

    function hasFID (name, attrs) {
      return name === 'fi' && !!attrs && typeof attrs.fid === 'number'
    }
  }

  // This processes the aforementioned PVT and the first navigation entry of the page.
  storeTiming (timingEntry) {
    if (!timingEntry) return

    // loop iterates through prototype also (for FF)
    for (let key in timingEntry) {
      let val = timingEntry[key]

      // ignore size and status type nodes that do not map to timestamp metrics
      const lck = key.toLowerCase()
      if (lck.indexOf('size') >= 0 || lck.indexOf('status') >= 0) continue

      // ignore inherited methods, meaningless 0 values, and bogus timestamps
      // that are in the future (Microsoft Edge seems to sometimes produce these)
      if (!(typeof val === 'number' && val >= 0)) continue

      val = Math.round(val)
      this.storeSTN({
        n: key,
        s: val,
        e: val,
        o: 'document',
        t: 'timing'
      })
    }
  }

  // Tracks duration of native APIs wrapped by wrap-timer & wrap-raf.
  storeTimer (target, start, end, type) {
    const evt = {
      n: type,
      s: start,
      e: end,
      o: 'window',
      t: (type === 'requestAnimationFrame') ? type : 'timer'
    }
    this.storeSTN(evt)
  }

  // Tracks the events and their listener's duration on objects wrapped by wrap-events.
  storeEvent (currentEvent, target, start, end) {
    if (this.shouldIgnoreEvent(currentEvent, target)) return

    const evt = {
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

  shouldIgnoreEvent (event, target) {
    const origin = this.evtOrigin(event.target, target)
    if (event.type in ignoredEvents.global) return true
    if (!!ignoredEvents[origin] && ignoredEvents[origin].ignoreAll) return true
    if (!!ignoredEvents[origin] && event.type in ignoredEvents[origin]) return true
    return false
  }

  evtName (type) {
    switch (type) {
      case 'keydown':
      case 'keyup':
      case 'keypress':
        return 'typing'
      case 'mousemove':
      case 'mouseenter':
      case 'mouseleave':
      case 'mouseover':
      case 'mouseout':
        return 'mousing'
      case 'scroll':
        return 'scrolling'
      case 'touchstart':
      case 'touchmove':
      case 'touchend':
      case 'touchcancel':
      case 'touchenter':
      case 'touchleave':
        return 'touching'
      default:
        return type
    }
  }

  evtOrigin (t, target) {
    let origin = 'unknown'

    if (t && t instanceof XMLHttpRequest) {
      const params = this.ee.context(t).params
      if (!params || !params.status || !params.method || !params.host || !params.pathname) return 'xhrOriginMissing'
      origin = params.status + ' ' + params.method + ': ' + params.host + params.pathname
    } else if (t && typeof (t.tagName) === 'string') {
      origin = t.tagName.toLowerCase()
      if (t.id) origin += '#' + t.id
      if (t.className) {
        for (let i = 0; i < t.classList.length; i++) origin += '.' + t.classList[i]
      }
    }

    if (origin === 'unknown') {
      if (typeof target === 'string') origin = target
      else if (target === document) origin = 'document'
      else if (target === window) origin = 'window'
      else if (target instanceof FileReader) origin = 'FileReader'
    }

    return origin
  }

  // Tracks when the window history API specified by wrap-history is used.
  storeHist (path, old, time) {
    const node = {
      n: 'history.pushState',
      s: time,
      e: time,
      o: path,
      t: old
    }
    this.storeSTN(node)
  }

  // Processes all the PerformanceResourceTiming entries captured (by observer).
  storeResources (resources) {
    if (!resources || resources.length === 0) return

    resources.forEach((currentResource) => {
      if ((currentResource.fetchStart | 0) <= this.laststart) return // don't recollect already-seen resources

      const parsed = parseUrl(currentResource.name)
      const res = {
        n: currentResource.initiatorType,
        s: currentResource.fetchStart | 0,
        e: currentResource.responseEnd | 0,
        o: parsed.protocol + '://' + parsed.hostname + ':' + parsed.port + parsed.pathname, // resource.name is actually a URL so it's the source
        t: currentResource.entryType
      }
      this.storeSTN(res)
    })

    this.laststart = resources[resources.length - 1].fetchStart | 0
  }

  // JavascriptError (FEATURE) events pipes into ST here.
  storeErrorAgg (type, name, params, metrics) {
    if (type !== 'err') return // internal errors are purposefully ignored
    const node = {
      n: 'error',
      s: metrics.time,
      e: metrics.time,
      o: params.message,
      t: params.stackHash
    }
    this.storeSTN(node)
  }

  // Ajax (FEATURE) events--XML & fetches--pipes into ST here.
  storeXhrAgg (type, name, params, metrics) {
    if (type !== 'xhr') return
    const node = {
      n: 'Ajax',
      s: metrics.time,
      e: metrics.time + metrics.duration,
      o: params.status + ' ' + params.method + ': ' + params.host + params.pathname,
      t: 'ajax'
    }
    this.storeSTN(node)
  }

  // Central function called by all the other store__ & addToTrace API to append a trace node.
  storeSTN (stn) {
    if (this.nodeCount >= this.maxNodesPerHarvest) return // limit the amount of data that is stored at once

    if (this.trace[stn.n]) this.trace[stn.n].push(stn)
    else this.trace[stn.n] = [stn]

    this.nodeCount++
  }

  // Used by session trace's harvester to create the payload body.
  takeSTNs (retry) {
    if (!this.resourceObserver) { // if PO isn't supported, this checks resourcetiming buffer every harvest.
      this.storeResources(window.performance.getEntriesByType('resource'))
    }

    const stns = Object.entries(this.trace).flatMap(([name, listOfSTNodes]) => { // basically take the "this.trace" map-obj and concat all the list-type values
      if (!(name in toAggregate)) return listOfSTNodes
      // Special processing for event nodes dealing with user inputs:
      const reindexByOriginFn = this.smearEvtsByOrigin(name)
      const partitionListByOriginMap = listOfSTNodes.sort((a, b) => a.s - b.s).reduce(reindexByOriginFn, {})
      return Object.values(partitionListByOriginMap).flat() // join the partitions back into 1-D, now ordered by origin then start time
    }, this)
    if (stns.length === 0) return {}

    if (retry) {
      this.sentTrace = this.trace
    }
    this.trace = {}
    this.nodeCount = 0

    const stnInfo = {
      qs: { st: String(getRuntime(this.agentIdentifier).offset) },
      body: { res: stns }
    }
    if (!this.ptid) { // send custom and user attributes on the very first ST harvest only
      const { userAttributes, atts, jsAttributes } = getInfo(this.agentIdentifier)
      stnInfo.qs.ua = userAttributes
      stnInfo.qs.at = atts
      const ja = stringify(jsAttributes)
      stnInfo.qs.ja = ja === '{}' ? null : ja
    }
    return stnInfo
  }

  smearEvtsByOrigin (name) {
    const maxGap = toAggregate[name][0]
    const maxLen = toAggregate[name][1]
    const lastO = {}

    return (byOrigin, evtNode) => {
      let lastArr = byOrigin[evtNode.o]
      if (!lastArr) lastArr = byOrigin[evtNode.o] = []

      const last = lastO[evtNode.o]

      if (name === 'scrolling' && !trivial(evtNode)) {
        lastO[evtNode.o] = null
        evtNode.n = 'scroll'
        lastArr.push(evtNode)
      } else if (last && (evtNode.s - last.s) < maxLen && last.e > (evtNode.s - maxGap)) {
        last.e = evtNode.e
      } else {
        lastO[evtNode.o] = evtNode
        lastArr.push(evtNode)
      }

      return byOrigin
    }

    function trivial (node) {
      const limit = 4
      if (node && typeof node.e === 'number' && typeof node.s === 'number' && (node.e - node.s) < limit) return true
      else return false
    }
  }
}
