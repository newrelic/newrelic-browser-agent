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
import { evtName } from './utils'

const ignoredEvents = {
  // we find that certain events are noisy (and not easily smearable like mousemove) and/or duplicative (like with click vs mousedown/mouseup).
  // These would ONLY ever be tracked in ST if the application has event listeners defined for these events... however, just in case - ignore these anyway.
  global: { mouseup: true, mousedown: true },
  // certain events are present both in the window and in PVT metrics.  PVT metrics are prefered so the window events should be ignored
  window: { load: true, pagehide: true },
  // when ajax instrumentation is disabled, all XMLHttpRequest events will return with origin = xhrOriginMissing and should be ignored
  xhrOriginMissing: { ignoreAll: true }
}

const SMEARABLES = {
  typing: 'typing',
  scrolling: 'scrolling',
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

/** The purpose of this class is to manage, normalize, and drop various ST nodes as needed without polluting the main ST modules */
export class TraceStorage {
  /** prevents duplication of event nodes by keeping a reference of each one seen per harvest cycle */
  prevStoredEvents = new Set()

  constructor (parent) {
    this.parent = parent
  }

  /**
   * Checks if a trace node is smearable with previously stored nodes.
   * @param {TraceNode} stn
   * @returns {boolean} true if the node is smearable, false otherwise
   */
  #isSmearable (stn) {
    return stn.n in SMEARABLES
  }

  /**
   * Attempts to smear the current trace node with the last stored event in the event buffer.
   * If the last stored event is smearable and matches the current node's origin and type, it will merge the two nodes and return true.
   * If not, it will return false.
   * This is used to reduce the number of smearable trace nodes created for events that occur in quick succession.
   * @param {TraceNode} stn
   * @returns {boolean} true if the node was successfully smeared, false otherwise
   */
  #smear (stn) {
    /**
     * The matcher function to be executed by the event buffer merge method. It must be the same origin and node type,
     * the start time of the new node must be within a certain length of the last seen node's start time,
     * and the end time of the last seen node must be within a certain gap of the new node's start time.
     * If all these conditions are met, we can merge the last seen node's end time with the new one.
     * @param {TraceNode} storedEvent - the event already stored in the event buffer to potentially be merged with
     */
    const matcher = (storedEvent) => {
      return !(storedEvent.o !== stn.o || storedEvent.n !== stn.n || (stn.s - storedEvent.s) < LENGTHS[stn.o] || (storedEvent.e > (stn.s - GAPS[stn.o])))
    }

    /** the data to be smeared together with a matching event -- if one is found in the event buffer using the matcher defined above */
    const smearableData = { e: stn.e }

    return this.parent.events.merge(matcher, smearableData)
  }

  /**
   * Checks if the event should be ignored based on rules around its type and/or origin.
   * @param {TraceNode} stn
   * @returns {boolean} true if the event should be ignored, false otherwise
   */
  #shouldIgnoreEvent (stn) {
    if (stn.n in ignoredEvents.global) return true // ignore noisy global events or window events that are already captured by PVT metrics
    const origin = stn.o
    if (ignoredEvents[origin]?.ignoreAll || ignoredEvents[origin]?.[stn.n]) return true
    return (origin === 'xhrOriginMissing' && stn.n === 'Ajax') // ignore XHR events when the origin is missing
  }

  /**
   * Checks if a new node can be stored based on the current state of the trace storage class itself as well as the parent class.
   * @returns {boolean} true if a new node can be stored, false otherwise
   */
  #canStoreNewNode () {
    if (this.parent.blocked) return false
    if (this.parent.events.length >= MAX_NODES_PER_HARVEST) { // limit the amount of pending data awaiting next harvest
      if (this.parent.mode !== MODE.ERROR) return false
      this.trimSTNsByTime() // if we're in error mode, we can try to clear the trace storage to make room for new nodes
      if (this.parent.events.length >= MAX_NODES_PER_HARVEST) this.trimSTNsByIndex(1) // if we still can't store new nodes, trim before index 1 to make room for new nodes
    }
    return true
  }

  /**
 * Attempts to store a new trace node in the event buffer.
 * @param {TraceNode} stn
 * @returns {boolean} true if the node was successfully stored, false otherwise
 */
  #storeSTN (stn) {
    if (this.#shouldIgnoreEvent(stn) || !this.#canStoreNewNode()) return false

    /** attempt to smear -- if not possible or it doesnt find a match -- just add it directly to the event buffer */
    if (!this.#isSmearable(stn) || !this.#smear(stn)) this.parent.events.add(stn)
    return true
  }

  /**
   * Stores a new trace node in the event buffer.
   * @param {TraceNode} node
   * @returns {boolean} true if the node was successfully stored, false otherwise
   */
  storeNode (node) {
    return this.#storeSTN(node)
  }

  /**
   * Processes a PVT (Page Visibility Timing) entry.
   * @param {*} name
   * @param {*} value
   * @param {*} attrs
   * @returns {boolean} true if the node was successfully stored, false otherwise
   */
  processPVT (name, value, attrs) {
    return this.storeTiming({ [name]: value })
  }

  /**
   * Stores a timing entry in the event buffer.
   * @param {*} timingEntry
   * @param {*} isAbsoluteTimestamp
   * @returns {boolean} true if ALL possible nodes were successfully stored, false otherwise
   */
  storeTiming (timingEntry, isAbsoluteTimestamp = false) {
    if (!timingEntry) return false

    let allStored = true
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
      if (!this.#storeSTN(new TraceNode(key, val, val, 'document', 'timing'))) allStored = false
    }
    return allStored
  }

  /**
   * Tracks the events and their listener's duration on objects wrapped by wrap-events.
   * @param {*} currentEvent - the event to be stored
   * @param {*} target - the target of the event
   * @param {*} start - the start time of the event
   * @param {*} end - the end time of the event
   * @returns {boolean} true if the event was successfully stored, false otherwise
   */
  storeEvent (currentEvent, target, start, end) {
    /**
     * Important! -- This check NEEDS to be done directly in this handler, before converting to a TraceNode so that the
     * reference pointer to the Event node itself is the object being checked for duplication
     * **/
    if (this.prevStoredEvents.has(currentEvent) || !this.#canStoreNewNode()) return false
    this.prevStoredEvents.add(currentEvent)

    const evt = new TraceNode(evtName(currentEvent.type), start, end, undefined, 'event')
    try {
      // webcomponents-lite.js can trigger an exception on currentEvent.target getter because
      // it does not check currentEvent.currentTarget before calling getRootNode() on it
      evt.o = eventOrigin(currentEvent.target, target, this.parent.ee)
    } catch (e) {
      evt.o = eventOrigin(null, target, this.parent.ee)
    }
    return this.#storeSTN(evt)
  }

  /**
   * Tracks when the window history API specified by wrap-history is used.
   * @param {*} path
   * @param {*} old
   * @param {*} time
   * @returns {boolean} true if the history node was successfully stored, false otherwise
   */
  storeHist (path, old, time) {
    return this.#storeSTN(new TraceNode('history.pushState', time, time, path, old))
  }

  /**
   * Processes all the PerformanceResourceTiming entries captured (by observer).
   * @param {*[]} resources
   * @returns {boolean} true if all resource nodes were successfully stored, false otherwise
   */
  storeResources (resources) {
    if (!resources || resources.length === 0) return false

    let allStored = true
    for (let i = 0; i < resources.length; i++) {
      const currentResource = resources[i]
      if (!this.#canStoreNewNode()) break // stop processing if we can't store any more resource nodes anyways

      const { initiatorType, fetchStart, responseEnd, entryType } = currentResource
      const { protocol, hostname, port, pathname } = parseUrl(currentResource.name)
      const res = new TraceNode(initiatorType, fetchStart | 0, responseEnd | 0, `${protocol}://${hostname}:${port}${pathname}`, entryType)

      if (!this.#storeSTN(res)) allStored = false
    }

    return allStored
  }

  /**
   * JavascriptError (FEATURE) events pipes into ST here.
   * @param {*} type
   * @param {*} name
   * @param {*} params
   * @param {*} metrics
   * @returns {boolean} true if the error node was successfully stored, false otherwise
   */
  storeErrorAgg (type, name, params, metrics) {
    if (type !== 'err') return false // internal errors are purposefully ignored
    return this.#storeSTN(new TraceNode('error', metrics.time, metrics.time, params.message, params.stackHash))
  }

  /**
   * Ajax (FEATURE) events--XML & fetches--pipes into ST here.
   * @param {*} type
   * @param {*} name
   * @param {*} params
   * @param {*} metrics
   * @returns {boolean} true if the Ajax node was successfully stored, false otherwise
   */
  storeXhrAgg (type, name, params, metrics) {
    if (type !== 'xhr') return false
    return this.#storeSTN(new TraceNode('Ajax', metrics.time, metrics.time + metrics.duration, `${params.status} ${params.method}: ${params.host}${params.pathname}`, 'ajax'))
  }

  /**
   * Trims stored trace nodes in the event buffer by start time.
   * @param {number} lookbackDuration
   * @returns {void}
   */
  trimSTNsByTime (lookbackDuration = ERROR_MODE_SECONDS_WINDOW) {
    this.parent.events.clear({
      clearBeforeTime: Math.max(now - lookbackDuration, 0),
      timestampKey: 'e'
    })
  }

  /**
   * Trims stored trace nodes in the event buffer before a given index value.
   * @param {number} index
   * @returns {void}
   */
  trimSTNsByIndex (index = 0) {
    this.parent.events.clear({
      clearBeforeIndex: index // trims before index value
    })
  }

  /**
   * clears the stored events in the event buffer.
   * This is used to release references to past events for garbage collection.
   * @returns {void}
   */
  clear () {
    this.prevStoredEvents.clear() // release references to past events for GC
  }
}
