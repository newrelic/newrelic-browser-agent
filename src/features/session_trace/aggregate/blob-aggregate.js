/**
 * The plan with this would be to report from the old file to the old agg and this file to the
 * blob agg until the API is solidified and shipped.  This file will be DISABLED by default.
 * At which point the old agg will be ripped out and only the new agg will report and be renamed to "index"
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { getConfigurationValue, getRuntime } from '../../../common/config/config'
import { FEATURE_NAME } from '../constants'
import { MODE, SESSION_EVENTS } from '../../../common/session/session-entity'
import { AggregateBase } from '../../utils/aggregate-base'
import { generateRandomHexString } from '../../../common/ids/unique-id'
import { TraceStorage } from './trace/storage'

const REQ_THRESHOLD_TO_SEND = 30
const ERROR_MODE_SECONDS_WINDOW = 30 * 1000 // sliding window of nodes to track when simply monitoring (but not harvesting) in error mode

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME

  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    this.agentRuntime = getRuntime(agentIdentifier)

    // Very unlikely, but in case the existing XMLHttpRequest.prototype object on the page couldn't be wrapped.
    if (!this.agentRuntime.xhrWrappable) return

    this.agentRuntime.ptid = this.ptid = generateRandomHexString(8)
    this.sentTrace = null
    this.harvestTimeSeconds = getConfigurationValue(agentIdentifier, 'session_trace.harvestTimeSeconds') || 10
    this.maxNodesPerHarvest = getConfigurationValue(agentIdentifier, 'session_trace.maxNodesPerHarvest') || 1000
    this.seenAnError = false

    const shouldSetup = getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled') === true

    if (shouldSetup) {
      this.traceStorage = new TraceStorage(this)
      this.waitForFlags(['stn']).then(stMode => this.initialize(stMode))
    }
  }

  initialize (stMode, ignoreSession) {
    if (this.blocked) return
    this.initialized = true

    /** ST/SR sampling flow in BCS - https://drive.google.com/file/d/19hwt2oft-8Hh4RrjpLqEXfpP_9wYBLcq/view?usp=sharing */
    if (!this.agentRuntime.session.isNew && !ignoreSession) this.mode = this.agentRuntime.session.state.sessionTraceMode
    else this.mode = stMode

    if (this.mode === MODE.OFF) return

    // The SessionEntity class can emit a message indicating the session was cleared and reset (expiry, inactivity). This feature must abort and never resume if that occurs.
    this.ee.on(SESSION_EVENTS.RESET, () => {
      this.abort()
    })

    this.ee.on(SESSION_EVENTS.UPDATE, (eventType, sessionState) => {
      // this will only have an effect if ST is NOT already in full mode
      if (sessionState.sessionReplayMode === MODE.FULL && this.mode !== MODE.FULL) this.switchToFull()
    })

    this.scheduler = new HarvestScheduler('browser/blobs', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds,
      getPayload: this.prepareHarvest.bind(this),
      raw: true
    }, this)

    registerHandler('bst', (...args) => this.traceStorage.storeEvent(...args), this.featureName, this.ee)
    registerHandler('bstResource', (...args) => this.traceStorage.storeResources(...args), this.featureName, this.ee)
    registerHandler('bstHist', (...args) => this.traceStorage.storeHist(...args), this.featureName, this.ee)
    registerHandler('bstXhrAgg', (...args) => this.traceStorage.storeXhrAgg(...args), this.featureName, this.ee)
    registerHandler('bstApi', (...args) => this.traceStorage.storeSTN(...args), this.featureName, this.ee)
    registerHandler('errorAgg', (...args) => this.traceStorage.storeErrorAgg(...args), this.featureName, this.ee)
    registerHandler('pvtAdded', (...args) => this.traceStorage.processPVT(...args), this.featureName, this.ee)

    registerHandler('errorAgg', () => {
      this.errorNoticed = true
      if (this.mode === MODE.ERROR) this.switchToFull()
    }, this.featureName, this.ee)

    if (typeof PerformanceNavigationTiming !== 'undefined') {
      this.traceStorage.storeTiming(window.performance.getEntriesByType('navigation')[0])
    } else {
      this.traceStorage.storeTiming(window.performance.timing)
    }

    this.drain()

    if (this.mode === MODE.FULL) this.startHarvesting()

    this.agentRuntime.session.write({ sessionTraceMode: this.mode })
  }

  startHarvesting () {
    this.scheduler.runHarvest({ needResponse: true })
    this.scheduler.startTimer(this.harvestTimeSeconds)
  }

  prepareHarvest (options) {
    if (this.traceStorage.nodeCount <= REQ_THRESHOLD_TO_SEND && !options.isFinalHarvest) {
      // Only harvest when more than some threshold of nodes are pending, after the very first harvest, with the exception of the last outgoing harvest.
      return
    }
    if (this.mode === MODE.OFF && Object.keys(this.trace).length === 0) return
    if (this.mode === MODE.ERROR) return // Trace in this mode should never be harvesting, even on unload

    const { stns, earliestTimeStamp } = this.traceStorage.takeSTNs()
    if (options.retry) {
      this.sentTrace = stns
    }
    let firstHarvestOfSession
    if (this.agentRuntime.session) {
      const isFirstPayload = !this.agentRuntime.session.state.traceHarvestStarted
      firstHarvestOfSession = { fsh: Number(isFirstPayload) } // converted to '0' | '1'
      if (isFirstPayload) this.agentRuntime.session.write({ traceHarvestStarted: true })
    }

    return {
      qs: {
        st: this.agentRuntime.offset,
        /** hr === "hasReplay" in NR1, standalone is always checked and processed before harvesting
         * so a race condition between ST and SR states should not be a concern if implemented here */
        hr: Number(!this.isStandalone),
        /** fts === "firstTimestamp" in NR1, indicates what the earliest NODE timestamp was
         * so that blob parsing doesn't need to happen to support UI/API functions  */
        fts: this.agentRuntime.offset + earliestTimeStamp,
        /** n === "nodeCount" in NR1, a count of nodes in the ST payload, so that blob parsing doesn't need to happen to support UI/API functions */
        n: stns.length, // node count
        ...firstHarvestOfSession
      },
      body: { res: stns }
    }
  }

  onHarvestFinished (result) {
    if (result.sent && result.retry && this.sentTrace) { // merge previous trace back into buffer to retry for next harvest
      Object.entries(this.sentTrace).forEach(([name, listOfSTNodes]) => { this.traceStorage.restoreNodes(name, listOfSTNodes) })
      this.sentTrace = null
    }
  }

  switchToFull () {
    if (this.mode === MODE.FULL) return
    const prevMode = this.mode
    this.mode = MODE.FULL
    if (prevMode === MODE.OFF && this.initialized) return this.initialize([this.mode], true)
    this.agentRuntime.session.write({ sessionTraceMode: this.mode })
    if (prevMode === MODE.ERROR && this.initialized) {
      this.trimSTNs(ERROR_MODE_SECONDS_WINDOW) // up until now, Trace would've been just buffering nodes up to max, which needs to be trimmed to last X seconds
    }
    this.startHarvesting()
  }

  abort () {
    this.blocked = true
    this.mode = MODE.OFF
    this.agentRuntime.session.write({ sessionTraceMode: this.mode })
  }
}
