/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MODE } from '../../../../common/session/constants'
import { now } from '../../../../common/timing/now'
import { parseUrl } from '../../../../common/url/parse-url'
import { eventOrigin } from '../../../../common/util/event-origin'
import { ERROR_MODE_SECONDS_WINDOW, MAX_NODES_PER_HARVEST } from '../../constants'
import { TraceNode } from './node'

const ignoredEvents = {
  // we find that certain events make the data too noisy to be useful
  global: { mouseup: true, mousedown: true, mousemove: true },
  // certain events are present both in the window and in PVT metrics.  PVT metrics are prefered so the window events should be ignored
  window: { load: true, pagehide: true },
  // when ajax instrumentation is disabled, all XMLHttpRequest events will return with origin = xhrOriginMissing and should be ignored
  xhrOriginMissing: { ignoreAll: true }
}

const SMEARABLES = {
  typing: 'typing',
  scroll: 'scroll',
  mousing: 'mousing',
  touching: 'touching'
}

const GAPS = {
  [SMEARABLES.typing]: 1000, // 1 second gap between typing events
  [SMEARABLES.scrolling]: 100, // 100ms gap between scrolling events
  [SMEARABLES.mousing]: 1000, // 1 second gap between mousing events
  [SMEARABLES.touching]: 1000 // 1 second gap between touching events
}

const LENGTHS = {
  [SMEARABLES.typing]: 2000, // 2 seconds max length for typing events
  [SMEARABLES.scrolling]: 1000, // 1 second max length for scrolling events
  [SMEARABLES.mousing]: 2000, // 2 seconds max length for mousing events
  [SMEARABLES.touching]: 2000 // 2 seconds max length for touching events
}

/** The purpose of this class is to manage, normalize, and retrieve ST nodes as needed without polluting the main ST modules */
export class TraceStorage {
  #laststart = 0

  prevStoredEvents = new Set()

  constructor (parent) {
    this.parent = parent
  }

  #isSmearable (stn) {
    return stn.n in SMEARABLES
  }

  #smear (stn) {
    // abort if its a trivial scroll event
    const isTrivialScroll = stn.n === SMEARABLES.scrolling && isTrivial(stn)
    if (isTrivialScroll) return

    /**
     * must be the same origin and node type, and the start time of the new node must be within a certain length of the last seen node's start time,
     * and the end time of the last seen node must be within a certain gap of the new node's start time.
     * If all these conditions are met, we can merge the last seen node's end time with the new one.
     * @param {TraceNode} storedEvent - the event already stored in the event buffer to potentially be merged with
     */
    const matcher = (storedEvent) => {
      return !(storedEvent.o !== stn.o || storedEvent.n !== stn.n || (stn.s - storedEvent.s) < LENGTHS[stn.o] || (storedEvent.e > (stn.s - GAPS[stn.o])))
    }

    // try to merge the last seen node with this one, if it fails it will return false, and we can add the event directly
    if (!this.parent.events.merge(matcher, { e: stn.e })) {
      this.parent.events.add(stn) // add the new node directly if it can't be smeared
    }

    // Helper to check if an event is trivial (very short duration)
    function isTrivial (node) {
      const limit = 4
      return !!(node && typeof node.e === 'number' && typeof node.s === 'number' && (node.e - node.s) < limit)
    }
  }

  #shouldIgnoreEvent (event, target) {
    if (event.type in ignoredEvents.global) return true
    const origin = eventOrigin(event.target, target, this.parent.ee)
    if (!!ignoredEvents[origin] && ignoredEvents[origin].ignoreAll) return true
    if (this.prevStoredEvents.has(event)) return true // prevent multiple listeners of an event from creating duplicate trace nodes per occurrence. Cleared every harvest. near-zero chance for re-duplication after clearing per harvest since the timestamps of the event are considered for uniqueness.
    return !!(!!ignoredEvents[origin] && event.type in ignoredEvents[origin])
  }

  #canStoreNewNode () {
    if (this.parent.blocked) return false
    if (this.parent.events.length >= MAX_NODES_PER_HARVEST) { // limit the amount of pending data awaiting next harvest
      if (this.parent.mode !== MODE.ERROR) return false
      this.trimSTNsByTime() // if we're in error mode, we can try to clear the trace storage to make room for new nodes
      if (this.parent.events.length >= MAX_NODES_PER_HARVEST) this.trimSTNsByIndex(1) // if we still can't store new nodes, trim before index 1 to make room for new nodes
      return true
    }
    return true
  }

  /** Central internal function called by all the other store__ & addToTrace API to append a trace node. They MUST all have checked #canStoreNewNode before calling this func!! */
  #storeSTN (stn) {
    if (!this.#canStoreNewNode()) return
    if (this.#isSmearable(stn)) this.#smear(stn)
    else {
      this.parent.events.add(stn)
    }
  }

  storeNode (node) {
    this.#storeSTN(node)
  }

  processPVT (name, value, attrs) {
    this.storeTiming({ [name]: value })
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
      if (!this.#canStoreNewNode()) return // at any point when no new nodes can be stored, there's no point in processing the rest of the timing entries
      this.#storeSTN(new TraceNode(key, val, val, 'document', 'timing'))
    }
  }

  // Tracks the events and their listener's duration on objects wrapped by wrap-events.
  storeEvent (currentEvent, target, start, end) {
    if (this.#shouldIgnoreEvent(currentEvent, target)) return
    if (!this.#canStoreNewNode()) return // need to check if adding node will succeed BEFORE storing event ref below (*cli Jun'25 - addressing memory leak in aborted ST issue #NR-420780)

    this.prevStoredEvents.add(currentEvent)

    const evt = new TraceNode(evtName(currentEvent.type), start, end, undefined, 'event')
    try {
      // webcomponents-lite.js can trigger an exception on currentEvent.target getter because
      // it does not check currentEvent.currentTarget before calling getRootNode() on it
      evt.o = eventOrigin(currentEvent.target, target, this.parent.ee)
    } catch (e) {
      evt.o = eventOrigin(null, target, this.parent.ee)
    }
    this.#storeSTN(evt)
  }

  // Tracks when the window history API specified by wrap-history is used.
  storeHist (path, old, time) {
    if (!this.#canStoreNewNode()) return
    this.#storeSTN(new TraceNode('history.pushState', time, time, path, old))
  }

  // Processes all the PerformanceResourceTiming entries captured (by observer).
  storeResources (resources) {
    if (!resources || resources.length === 0) return

    for (let i = 0; i < resources.length; i++) {
      const currentResource = resources[i]
      if ((currentResource.fetchStart | 0) <= this.#laststart) continue // don't recollect already-seen resources
      if (!this.#canStoreNewNode()) break // stop processing if we can't store any more resource nodes anyways

      const { initiatorType, fetchStart, responseEnd, entryType } = currentResource
      const { protocol, hostname, port, pathname } = parseUrl(currentResource.name)
      const res = new TraceNode(initiatorType, fetchStart | 0, responseEnd | 0, `${protocol}://${hostname}:${port}${pathname}`, entryType)

      this.#storeSTN(res)
    }

    this.#laststart = resources[resources.length - 1].fetchStart | 0
  }

  // JavascriptError (FEATURE) events pipes into ST here.
  storeErrorAgg (type, name, params, metrics) {
    if (type !== 'err') return // internal errors are purposefully ignored
    if (!this.#canStoreNewNode()) return
    this.#storeSTN(new TraceNode('error', metrics.time, metrics.time, params.message, params.stackHash))
  }

  // Ajax (FEATURE) events--XML & fetches--pipes into ST here.
  storeXhrAgg (type, name, params, metrics) {
    if (type !== 'xhr') return
    if (!this.#canStoreNewNode()) return
    this.#storeSTN(new TraceNode('Ajax', metrics.time, metrics.time + metrics.duration, `${params.status} ${params.method}: ${params.host}${params.pathname}`, 'ajax'))
  }

  trimSTNsByTime (lookbackDuration = ERROR_MODE_SECONDS_WINDOW) {
    this.parent.events.clear({
      clearBeforeTime: Math.max(now - lookbackDuration, 0),
      timestampKey: 'e'
    })
  }

  trimSTNsByIndex (index = 0) {
    this.parent.events.clear({
      clearBeforeIndex: index // trims before index value
    })
  }

  clear () {
    this.prevStoredEvents.clear() // release references to past events for GC
  }
}

function evtName (type) {
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
