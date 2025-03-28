/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../../../../common/constants/runtime'
import { DEFAULT_EXPIRES_MS, MODE } from '../../../../common/session/constants'
import { now } from '../../../../common/timing/now'
import { parseUrl } from '../../../../common/url/parse-url'
import { eventOrigin } from '../../../../common/util/event-origin'
import { MAX_NODES_PER_HARVEST } from '../../constants'
import { TraceNode } from './node'

const ERROR_MODE_SECONDS_WINDOW = 30 * 1000 // sliding window of nodes to track when simply monitoring (but not harvesting) in error mode
const SUPPORTS_PERFORMANCE_OBSERVER = typeof globalScope.PerformanceObserver === 'function'

const ignoredEvents = {
  // we find that certain events make the data too noisy to be useful
  global: { mouseup: true, mousedown: true, mousemove: true },
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

/** The purpose of this class is to manage, normalize, and retrieve ST nodes as needed without polluting the main ST modules */
export class TraceStorage {
  nodeCount = 0
  trace = {}
  earliestTimeStamp = Infinity
  latestTimeStamp = 0
  prevStoredEvents = new Set()
  #backupTrace

  constructor (parent) {
    this.parent = parent
    this.eventsSeenAfterSessionExpire = false
  }

  /** Central function called by all the other store__ & addToTrace API to append a trace node. */
  storeSTN (stn) {
    if (this.parent.blocked) return
    if (this.nodeCount >= MAX_NODES_PER_HARVEST) { // limit the amount of pending data awaiting next harvest
      if (this.parent.mode !== MODE.ERROR) return
      const openedSpace = this.trimSTNs(ERROR_MODE_SECONDS_WINDOW) // but maybe we could make some space by discarding irrelevant nodes if we're in sessioned Error mode
      if (openedSpace === 0) return
    }
    if (!this.isBeforeSessionExpiry(stn.s)) return

    if (this.trace[stn.n]) this.trace[stn.n].push(stn)
    else this.trace[stn.n] = [stn]

    if (stn.s < this.earliestTimeStamp) this.earliestTimeStamp = stn.s
    if (stn.s > this.latestTimeStamp) this.latestTimeStamp = stn.s
    this.nodeCount++
  }

  /**
   * Trim the collection of nodes awaiting harvest such that those seen outside a certain span of time are discarded.
   * @param {number} lookbackDuration Past length of time until now for which we care about nodes, in milliseconds
   * @returns {number} However many nodes were discarded after trimming.
   */
  trimSTNs (lookbackDuration) {
    let prunedNodes = 0
    const cutoffHighResTime = Math.max(now() - lookbackDuration, 0)
    Object.keys(this.trace).forEach(nameCategory => {
      const nodeList = this.trace[nameCategory]
      /* Notice nodes are appending under their name's list as they end and are stored. This means each list is already (roughly) sorted in chronological order by end time.
         * This isn't exact since nodes go through some processing & EE handlers chain, but it's close enough as we still capture nodes whose duration overlaps the lookback window.
         * ASSUMPTION: all 'end' timings stored are relative to timeOrigin (DOMHighResTimeStamp) and not Unix epoch based. */
      let cutoffIdx = nodeList.findIndex(node => cutoffHighResTime <= node.e)

      if (cutoffIdx === 0) return
      else if (cutoffIdx < 0) { // whole list falls outside lookback window and is irrelevant
        cutoffIdx = nodeList.length
        delete this.trace[nameCategory]
      } else nodeList.splice(0, cutoffIdx) // chop off everything outside our window i.e. before the last <lookbackDuration> timeframe

      this.nodeCount -= cutoffIdx
      prunedNodes += cutoffIdx
    })
    return prunedNodes
  }

  /** Used by session trace's harvester to create the payload body. */
  takeSTNs () {
    if (!SUPPORTS_PERFORMANCE_OBSERVER) { // if PO isn't supported, this checks resourcetiming buffer every harvest.
      this.storeResources(globalScope.performance?.getEntriesByType?.('resource'))
    }

    const stns = Object.entries(this.trace).flatMap(([name, listOfSTNodes]) => { // basically take the "this.trace" map-obj and concat all the list-type values
      if (!(name in toAggregate)) return listOfSTNodes
      // Special processing for event nodes dealing with user inputs:
      const reindexByOriginFn = this.smearEvtsByOrigin(name)
      const partitionListByOriginMap = listOfSTNodes.sort((a, b) => a.s - b.s).reduce(reindexByOriginFn, {})
      return Object.values(partitionListByOriginMap).flat() // join the partitions back into 1-D, now ordered by origin then start time
    }, this)

    const earliestTimeStamp = this.earliestTimeStamp
    const latestTimeStamp = this.latestTimeStamp
    return { stns, earliestTimeStamp, latestTimeStamp }
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
      return !!(node && typeof node.e === 'number' && typeof node.s === 'number' && (node.e - node.s) < limit)
    }
  }

  processPVT (name, value, attrs) {
    this.storeTiming({ [name]: value })
  }

  isBeforeSessionExpiry (entryTimestamp) {
    let isValidTimingEntry = entryTimestamp < DEFAULT_EXPIRES_MS

    if (!isValidTimingEntry && !this.eventsSeenAfterSessionExpire) {
      this.eventsSeenAfterSessionExpire = true
    }

    return isValidTimingEntry
  }

  storeTiming (timingEntry, isAbsoluteTimestamp = false) {
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
      if (this.parent.timeKeeper && this.parent.timeKeeper.ready && isAbsoluteTimestamp) {
        val = this.parent.timeKeeper.convertAbsoluteTimestamp(
          Math.floor(this.parent.timeKeeper.correctAbsoluteTimestamp(val))
        )
      }
      this.storeSTN(new TraceNode(key, val, val, 'document', 'timing'))
    }
  }

  // Tracks the events and their listener's duration on objects wrapped by wrap-events.
  storeEvent (currentEvent, target, start, end) {
    if (this.shouldIgnoreEvent(currentEvent, target)) return
    if (this.prevStoredEvents.has(currentEvent)) return // prevent multiple listeners of an event from creating duplicate trace nodes per occurrence. Cleared every harvest. near-zero chance for re-duplication after clearing per harvest since the timestamps of the event are considered for uniqueness.
    this.prevStoredEvents.add(currentEvent)

    const evt = new TraceNode(this.evtName(currentEvent.type), start, end, undefined, 'event')
    try {
      // webcomponents-lite.js can trigger an exception on currentEvent.target getter because
      // it does not check currentEvent.currentTarget before calling getRootNode() on it
      evt.o = eventOrigin(currentEvent.target, target, this.parent.ee)
    } catch (e) {
      evt.o = eventOrigin(null, target, this.parent.ee)
    }
    this.storeSTN(evt)
  }

  shouldIgnoreEvent (event, target) {
    if (event.type in ignoredEvents.global) return true
    const origin = eventOrigin(event.target, target, this.parent.ee)
    if (!!ignoredEvents[origin] && ignoredEvents[origin].ignoreAll) return true
    return !!(!!ignoredEvents[origin] && event.type in ignoredEvents[origin])
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

  // Tracks when the window history API specified by wrap-history is used.
  storeHist (path, old, time) {
    this.storeSTN(new TraceNode('history.pushState', time, time, path, old))
  }

  #laststart = 0
  // Processes all the PerformanceResourceTiming entries captured (by observer).
  storeResources (resources) {
    if (!resources || resources.length === 0) return

    resources.forEach((currentResource) => {
      if ((currentResource.fetchStart | 0) <= this.#laststart) return // don't recollect already-seen resources

      const { initiatorType, fetchStart, responseEnd, entryType } = currentResource
      const { protocol, hostname, port, pathname } = parseUrl(currentResource.name)
      const res = new TraceNode(initiatorType, fetchStart | 0, responseEnd | 0, `${protocol}://${hostname}:${port}${pathname}`, entryType)
      this.storeSTN(res)
    })

    this.#laststart = resources[resources.length - 1].fetchStart | 0
  }

  // JavascriptError (FEATURE) events pipes into ST here.
  storeErrorAgg (type, name, params, metrics) {
    if (type !== 'err') return // internal errors are purposefully ignored
    this.storeSTN(new TraceNode('error', metrics.time, metrics.time, params.message, params.stackHash))
  }

  // Ajax (FEATURE) events--XML & fetches--pipes into ST here.
  storeXhrAgg (type, name, params, metrics) {
    if (type !== 'xhr') return
    this.storeSTN(new TraceNode('Ajax', metrics.time, metrics.time + metrics.duration, `${params.status} ${params.method}: ${params.host}${params.pathname}`, 'ajax'))
  }

  /* Below are the interface expected & required of whatever storage is used across all features on an individual basis. This allows a common `.events` property on Trace shared with AggregateBase.
    Note that the usage must be in sync with the EventStoreManager class such that AggregateBase.makeHarvestPayload can run the same regardless of which storage class a feature is using. */
  isEmpty () {
    return this.nodeCount === 0
  }

  save () {
    this.#backupTrace = this.trace
  }

  get () {
    return [{ targetApp: this.parent.agentRef.mainAppKey, data: this.takeSTNs() }]
  }

  clear () {
    this.trace = {}
    this.nodeCount = 0
    this.prevStoredEvents.clear() // release references to past events for GC
    this.earliestTimeStamp = Infinity
    this.latestTimeStamp = 0
  }

  reloadSave () {
    Object.values(this.#backupTrace).forEach(stnsArray => stnsArray.forEach(stn => this.storeSTN(stn)))
  }

  clearSave () {
    this.#backupTrace = undefined
  }
}
