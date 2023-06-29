/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { parseUrl } from '../../../common/url/parse-url'
import { getConfigurationValue, getRuntime } from '../../../common/config/config'
import { now } from '../../../common/timing/now'
import { FEATURE_NAME } from '../constants'
import { drain } from '../../../common/drain/drain'
import { HandlerCache } from '../../utils/handler-cache'
import { MODE, SESSION_EVENTS } from '../../../common/session/session-entity'
import { getSessionReplayMode } from '../../session_replay/replay-mode'
import { AggregateBase } from '../../utils/aggregate-base'

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
const MAX_TRACE_DURATION = 10 * 60 * 1000 // 10 minutes
const REQ_THRESHOLD_TO_SEND = 30
const ERROR_MODE_SECONDS_WINDOW = 30 * 1000 // sliding window of nodes to track when simply monitoring (but not harvesting) in error mode

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  #scheduler

  constructor (agentIdentifier, aggregator, argsObj) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    this.agentRuntime = getRuntime(agentIdentifier)

    // Very unlikely, but in case the existing XMLHttpRequest.prototype object on the page couldn't be wrapped.
    if (!this.agentRuntime.xhrWrappable) return

    this.resourceObserver = argsObj?.resourceObserver // undefined if observer couldn't be created
    this.ptid = ''
    this.trace = {}
    this.nodeCount = 0
    this.sentTrace = null
    this.harvestTimeSeconds = getConfigurationValue(agentIdentifier, 'session_trace.harvestTimeSeconds') || 10
    this.maxNodesPerHarvest = getConfigurationValue(agentIdentifier, 'session_trace.maxNodesPerHarvest') || 1000
    this.isStandalone = false
    const operationalGate = new HandlerCache() // acts as a controller-intermediary that can enable or disable this feature's collection dynamically
    const sessionEntity = this.agentRuntime.session

    /* --- The following section deals with user sessions concept & contains non-trivial control flow. --- */
    const controlTraceOp = (traceMode) => {
      switch (traceMode) {
        case MODE.ERROR:
          this.startTracing(operationalGate, true)
          break
        case MODE.FULL:
        case true:
          this.startTracing(operationalGate)
          break
        case MODE.OFF:
        case false:
        default: // this feature becomes "off" (does nothing & nothing is sent)
          operationalGate.decide(false)
          break
      }
    }

    if (!sessionEntity) {
      // Since session manager isn't around, do the old Trace behavior of waiting for RUM response to decide feature activation.
      this.isStandalone = true
      registerHandler('rumresp-stn', (on) => controlTraceOp(on), this.featureName, this.ee)
    } else {
      let seenAnError = false
      let mostRecentModeKnown
      registerHandler('errorAgg', () => {
        // Switch to full capture mode on next harvest on first exception thrown only. Only done once so that sessionTraceMode isn't constantly overwritten after decision block.
        if (!seenAnError) {
          seenAnError = true
          /* If this cb executes before Trace has started, then no further action needed. But if...
           - startTracing already ran under ERROR mode, then it will NOT have kicked off the harvest-scheduler so that needs to be done & switch mode.
           - startTracing never ran because mode is OFF or Replay aborted or Traced turned off elsewhere OR trace already in FULL, then this should do nothing. */
          if (sessionEntity.state.sessionTraceMode === MODE.ERROR && this.#scheduler) {
            sessionEntity.write({ sessionTraceMode: (mostRecentModeKnown = MODE.FULL) })
            this.trimSTNs(ERROR_MODE_SECONDS_WINDOW) // up until now, Trace would've been just buffering nodes up to max, which needs to be trimmed to last X seconds
            this.#scheduler.runHarvest({ needResponse: true })
          }
        }
      }, this.featureName, this.ee)

      const stopTracePerm = () => {
        if (sessionEntity.state.sessionTraceMode !== MODE.OFF) sessionEntity.write({ sessionTraceMode: MODE.OFF })
        operationalGate.permanentlyDecide(false)
        if (mostRecentModeKnown === MODE.FULL) this.#scheduler?.runHarvest() // allow queued nodes (past opGate) to final harvest, unless they were buffered in other modes
        this.#scheduler?.stopTimer(true) // the 'true' arg here will forcibly block any future call to runHarvest, so the last runHarvest above must be prior
        this.#scheduler = null
      }

      // CAUTION: everything inside this promise runs post-load; event subscribers must be pre-load aka synchronous with constructor
      this.waitForFlags(['stn', 'sr']).then(async ([traceOn, replayOn]) => {
        if (!replayOn) {
          // When sr = 0 from BCS, also do the old Trace behavior:
          this.isStandalone = true
          controlTraceOp(traceOn)
        } else {
          this.ee.on('REPLAY_ABORTED', () => stopTracePerm())
          /* Assuming on page visible that the trace mode is updated from shared session,
           - if trace is turned off from the other page, it should be likewise here.
           - if trace switches to Full mode, harvest should start (prev: Error) if not already running (prev: Full). */
          this.ee.on(SESSION_EVENTS.RESUME, () => {
            const updatedTraceMode = sessionEntity.state.sessionTraceMode
            if (updatedTraceMode === MODE.OFF) stopTracePerm()
            else if (updatedTraceMode === MODE.FULL && this.#scheduler && !this.#scheduler.started) this.#scheduler.runHarvest({ needResponse: true })
            mostRecentModeKnown = updatedTraceMode
          })
          this.ee.on(SESSION_EVENTS.PAUSE, () => mostRecentModeKnown = sessionEntity.state.sessionTraceMode)

          if (!sessionEntity.isNew) { // inherit the same mode as existing session's Trace
            if (sessionEntity.state.sessionReplay === MODE.OFF) this.isStandalone = true
            controlTraceOp(mostRecentModeKnown = sessionEntity.state.sessionTraceMode)
          } else { // for new sessions, see the truth table associated with NEWRELIC-8662 wrt the new Trace behavior under session management
            const replayMode = await getSessionReplayMode(agentIdentifier)
            if (replayMode === MODE.OFF) this.isStandalone = true // without SR, Traces are still subject to old harvest limits

            let startingMode
            if (traceOn === true) { // CASE: both trace (entitlement+sampling) & replay (entitlement) flags are true from RUM
              startingMode = MODE.FULL // always full capture regardless of replay sampling decisions
            } else { // CASE: trace flag is off, BUT it must still run if replay is on (possibly)
              // At this point, it's possible that 1 or more exception was thrown, in which case just start in full if Replay originally started in ERROR mode.
              if (replayMode === MODE.ERROR && seenAnError) startingMode = MODE.FULL
              else startingMode = replayMode
            }
            sessionEntity.write({ sessionTraceMode: (mostRecentModeKnown = startingMode) })
            controlTraceOp(startingMode)
          }
        }
      })
    }
    /* --- EoS --- */

    // register the handlers immediately... but let the handlerCache decide if the data should actually get stored...
    registerHandler('bst', (...args) => operationalGate.settle(() => this.storeEvent(...args)), this.featureName, this.ee)
    registerHandler('bstResource', (...args) => operationalGate.settle(() => this.storeResources(...args)), this.featureName, this.ee)
    registerHandler('bstHist', (...args) => operationalGate.settle(() => this.storeHist(...args)), this.featureName, this.ee)
    registerHandler('bstXhrAgg', (...args) => operationalGate.settle(() => this.storeXhrAgg(...args)), this.featureName, this.ee)
    registerHandler('bstApi', (...args) => operationalGate.settle(() => this.storeSTN(...args)), this.featureName, this.ee)
    registerHandler('errorAgg', (...args) => operationalGate.settle(() => this.storeErrorAgg(...args)), this.featureName, this.ee)
    registerHandler('pvtAdded', (...args) => operationalGate.settle(() => this.processPVT(...args)), this.featureName, this.ee)
    drain(this.agentIdentifier, this.featureName)
  }

  startTracing (startupBuffer, dontStartHarvestYet = false) {
    if (typeof PerformanceNavigationTiming !== 'undefined') {
      this.storeTiming(window.performance.getEntriesByType('navigation')[0])
    } else {
      this.storeTiming(window.performance.timing)
    }

    this.#scheduler = new HarvestScheduler('resources', {
      onFinished: this.#onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds
    }, this)
    this.#scheduler.harvest.on('resources', this.#prepareHarvest.bind(this))
    if (dontStartHarvestYet === false) this.#scheduler.runHarvest({ needResponse: true }) // sends first stn harvest immediately
    startupBuffer.decide(true) // signal to ALLOW & process data in EE's buffer into internal nodes queued for next harvest
  }

  #onHarvestFinished (result) {
    if (result.sent && result.responseText && !this.ptid) { // continue interval harvest only if ptid was returned by server on the first
      this.agentRuntime.ptid = this.ptid = result.responseText
      this.#scheduler.startTimer(this.harvestTimeSeconds)
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

  #prepareHarvest (options) {
    /* Standalone refers to the legacy version of ST before the idea of 'session' or the Replay feature existed.
      It has a different behavior on returning a payload for harvest than when used in tandem with either of those concepts. */
    if (this.isStandalone) {
      if (now() > MAX_TRACE_DURATION) { // been collecting for over the longest duration we should run for, empty trace object so ST has nothing to send
        this.#scheduler.stopTimer()
        this.trace = {}
        return
      }
      // Only harvest when more than some threshold of nodes are pending, after the very first harvest.
      if (this.ptid && this.nodeCount <= REQ_THRESHOLD_TO_SEND) return
    } else {
    //   -- *cli May '26 - Update: Not rate limiting backgrounded pages either for now.
    //   if (this.ptid && document.visibilityState === 'hidden' && this.nodeCount <= REQ_THRESHOLD_TO_SEND) return

      const currentMode = this.agentRuntime.session.state.sessionTraceMode
      /* There could still be nodes previously collected even after Trace (w/ session mgmt) is turned off. Hence, continue to send the last batch.
       * The intermediary controller SHOULD be already switched off so that no nodes are further queued. */
      if (currentMode === MODE.OFF && Object.keys(this.trace).length === 0) return
      if (currentMode === MODE.ERROR) return // Trace in this mode should never be harvesting, even on unload
    }
    return this.takeSTNs(options.retry)
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

  #laststart = 0
  // Processes all the PerformanceResourceTiming entries captured (by observer).
  storeResources (resources) {
    if (!resources || resources.length === 0) return

    resources.forEach((currentResource) => {
      if ((currentResource.fetchStart | 0) <= this.#laststart) return // don't recollect already-seen resources

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

    this.#laststart = resources[resources.length - 1].fetchStart | 0
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
    if (this.nodeCount >= this.maxNodesPerHarvest) { // limit the amount of pending data awaiting next harvest
      if (this.isStandalone || this.agentRuntime.session.state.sessionTraceMode !== MODE.ERROR) return
      const openedSpace = this.trimSTNs(ERROR_MODE_SECONDS_WINDOW) // but maybe we could make some space by discarding irrelevant nodes if we're in sessioned Error mode
      if (openedSpace == 0) return
    }

    if (this.trace[stn.n]) this.trace[stn.n].push(stn)
    else this.trace[stn.n] = [stn]

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

      if (cutoffIdx == 0) return
      else if (cutoffIdx < 0) { // whole list falls outside lookback window and is irrelevant
        cutoffIdx = nodeList.length
        delete this.trace[nameCategory]
      } else nodeList.splice(0, cutoffIdx) // chop off everything outside our window i.e. before the last <lookbackDuration> timeframe

      this.nodeCount -= cutoffIdx
      prunedNodes += cutoffIdx
    })
    return prunedNodes
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

    return {
      qs: { st: String(getRuntime(this.agentIdentifier).offset) },
      body: { res: stns }
    }
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
