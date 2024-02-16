/**
 * The plan with this would be to report from the old file to the old agg and this file to the
 * blob agg until the API is solidified and shipped.  This file will be DISABLED by default.
 * At which point the old agg will be ripped out and only the new agg will report and be renamed to "index"
 */
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { FEATURE_NAME } from '../constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { generateRandomHexString } from '../../../common/ids/unique-id'
import { TraceStorage } from './trace/storage'
import { obj as encodeObj } from '../../../common/url/encode'
import { now } from '../../../common/timing/now'
import { deregisterDrain } from '../../../common/drain/drain'
import { globalScope } from '../../../common/constants/runtime'
import { MODE, SESSION_EVENTS } from '../../../common/session/constants'

const REQ_THRESHOLD_TO_SEND = 30
const ERROR_MODE_SECONDS_WINDOW = 30 * 1000 // sliding window of nodes to track when simply monitoring (but not harvesting) in error mode
/** Reserved room for query param attrs */
const QUERY_PARAM_PADDING = 5000
export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME

  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    this.agentRuntime = getRuntime(agentIdentifier)
    this.agentInfo = getInfo(agentIdentifier)

    // Very unlikely, but in case the existing XMLHttpRequest.prototype object on the page couldn't be wrapped.
    if (!this.agentRuntime.xhrWrappable) return

    /** The PageTrace ID generated at each hard page load */
    this.agentRuntime.ptid = this.ptid = generateRandomHexString(10)
    /** A buffer to hold on to harvested traces in the case that a retry must be made later */
    this.sentTrace = null
    this.harvestTimeSeconds = getConfigurationValue(agentIdentifier, 'session_trace.harvestTimeSeconds') || 10
    this.maxNodesPerHarvest = getConfigurationValue(agentIdentifier, 'session_trace.maxNodesPerHarvest') || 1000
    /** A flag used to maintain trace mode state at initialization time. If true at init time and sampled in error mode, it will flip to full */
    this.errorNoticed = false
    /** Tied to the entitlement flag response from BCS.  Will short circuit operations of the agg if false  */
    this.entitled = undefined
    /** A flag used to decide if the 30 node threshold should be ignored on the first harvest to ensure sending on the first payload */
    this.everHarvested = false
    /** Do not run if cookies_enabled is false */
    const shouldSetup = getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled') === true

    if (shouldSetup) {
      /** TraceStorage is the mechanism that holds, normalizes and aggregates ST nodes.  It will be accessed and purged when harvests occur */
      this.traceStorage = new TraceStorage(this)
      /** This agg needs information about sampling (stn) and entitlements (ste) to make the appropriate decisions on running */
      this.waitForFlags(['stn', 'ste']).then(([stMode, stEntitled]) => this.initialize(stMode, stEntitled))
    }
  }

  /** Sets up event listeners, and initializes this module to run in the correct "mode".  Can be triggered from a few places, but makes an effort to only set up listeners once */
  initialize (stMode, stEntitled, ignoreSession) {
    this.entitled ??= stEntitled
    if (this.blocked || !this.entitled) return deregisterDrain(this.agentIdentifier, this.featureName)

    if (!this.initialized) {
      // The SessionEntity class can emit a message indicating the session was cleared and reset (expiry, inactivity). This feature must abort and never resume if that occurs.
      this.ee.on(SESSION_EVENTS.RESET, () => {
        this.abort()
      })
      // The SessionEntity can have updates (locally or across tabs for SR mode changes), (across tabs for ST mode changes).
      // Those updates should be sync'd here to ensure this page also honors the mode after initialization
      this.ee.on(SESSION_EVENTS.UPDATE, (eventType, sessionState) => {
        // this will only have an effect if ST is NOT already in full mode
        if (this.mode !== MODE.FULL && (sessionState.sessionReplayMode === MODE.FULL || sessionState.sessionTraceMode === MODE.FULL)) this.switchToFull()
      })
    }

    /** ST/SR sampling flow in BCS - https://drive.google.com/file/d/19hwt2oft-8Hh4RrjpLqEXfpP_9wYBLcq/view?usp=sharing */
    /** ST will run in the mode provided by BCS if the session IS NEW.  If not... it will use the state of the session entity to determine what mode to run in */
    if (!this.agentRuntime.session.isNew && !ignoreSession) this.mode = this.agentRuntime.session.state.sessionTraceMode
    else this.mode = stMode

    this.initialized = true
    /** If the mode is off, we do not want to hold up draining for other features, so we deregister the feature for now.
     * If it drains later (due to a mode change), data and handlers will instantly drain instead of waiting for the registry. */
    if (this.mode === MODE.OFF) return deregisterDrain(this.agentIdentifier, this.featureName)

    this.scheduler = new HarvestScheduler('browser/blobs', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds,
      getPayload: this.prepareHarvest.bind(this),
      raw: true
    }, this)

    /** The handlers set up by the Inst file */
    registerHandler('bst', (...args) => this.traceStorage.storeEvent(...args), this.featureName, this.ee)
    registerHandler('bstResource', (...args) => this.traceStorage.storeResources(...args), this.featureName, this.ee)
    registerHandler('bstHist', (...args) => this.traceStorage.storeHist(...args), this.featureName, this.ee)
    registerHandler('bstXhrAgg', (...args) => this.traceStorage.storeXhrAgg(...args), this.featureName, this.ee)
    registerHandler('bstApi', (...args) => this.traceStorage.storeSTN(...args), this.featureName, this.ee)
    registerHandler('errorAgg', (...args) => this.traceStorage.storeErrorAgg(...args), this.featureName, this.ee)
    registerHandler('pvtAdded', (...args) => this.traceStorage.processPVT(...args), this.featureName, this.ee)

    /** A separate handler for noticing errors, and switching to "full" mode if running in "error" mode */
    registerHandler('errorAgg', () => {
      this.errorNoticed = true
      if (this.mode === MODE.ERROR) this.switchToFull()
    }, this.featureName, this.ee)

    if (typeof PerformanceNavigationTiming !== 'undefined') {
      this.traceStorage.storeTiming(globalScope.performance?.getEntriesByType?.('navigation')[0])
    } else {
      this.traceStorage.storeTiming(globalScope.performance?.timing)
    }

    /** Only start actually harvesting if running in full mode at init time */
    if (this.mode === MODE.FULL) this.startHarvesting()
    this.agentRuntime.session.write({ sessionTraceMode: this.mode })
    /** drain and kick off the registerHandlers to start processing any buffered data */
    if (!this.drained) this.drain()
  }

  /** This module does not auto harvest by default -- it needs to be kicked off.  Once this method is called, it will then harvest on an interval */
  startHarvesting () {
    this.scheduler.runHarvest({ needResponse: true })
    this.scheduler.startTimer(this.harvestTimeSeconds)
  }

  /** Called by the harvest scheduler at harvest time to retrieve the payload.  This will only actually return a payload if running in full mode */
  prepareHarvest (options = {}) {
    if (this.traceStorage.nodeCount <= REQ_THRESHOLD_TO_SEND && !options.isFinalHarvest && this.everHarvested) {
      // Only harvest when more than some threshold of nodes are pending, after the very first harvest, with the exception of the last outgoing harvest.
      return
    }
    if (this.mode === MODE.OFF && this.traceStorage.nodeCount === 0) return
    if (this.mode === MODE.ERROR) return // Trace in this mode should never be harvesting, even on unload

    /** Get the ST nodes from the traceStorage buffer.  This also returns helpful metadata about the payload. */
    const { stns, earliestTimeStamp, latestTimeStamp } = this.traceStorage.takeSTNs()
    if (options.retry) {
      this.sentTrace = stns
    }

    const firstSessionHarvest = this.agentRuntime.session && !this.agentRuntime.session.state.traceHarvestStarted
    if (firstSessionHarvest) this.agentRuntime.session.write({ traceHarvestStarted: true })

    const hasReplay = this.agentRuntime.session?.state.sessionReplayMode === 1
    const endUserId = this.agentInfo?.jsAttributes?.['enduser.id']

    this.everHarvested = true

    /** The blob consumer expects the following and will reject if not supplied:
     * browser_monitoring_key
     * type
     * app_id
     * protocol_version
     * attributes
     *
     * For data that does not fit the schema of the above, it should be url-encoded and placed into `attributes`
     */
    return {
      qs: {
        browser_monitoring_key: this.agentInfo.licenseKey,
        type: 'SessionTrace',
        app_id: this.agentInfo.applicationID,
        protocol_version: '0',
        attributes: encodeObj({
        // this section of attributes must be controllable and stay below the query param padding limit -- see QUERY_PARAM_PADDING
        // if not, data could be lost to truncation at time of sending, potentially breaking parsing / API behavior in NR1
          'trace.firstTimestamp': this.agentRuntime.offset + earliestTimeStamp,
          'trace.firstTimestampOffset': earliestTimeStamp,
          'trace.lastTimestamp': this.agentRuntime.offset + latestTimeStamp,
          'trace.lastTimestampOffset': latestTimeStamp,
          'trace.nodeCount': stns.length,
          ptid: `${this.ptid}`,
          session: `${this.agentRuntime.session?.state.value}`,
          rst: now(),
          ...(firstSessionHarvest && { firstSessionHarvest }),
          ...(hasReplay && { hasReplay }),
          // customer-defined data should go last so that if it exceeds the query param padding limit it will be truncated instead of important attrs
          ...(endUserId && { 'enduser.id': endUserId })
        // The Query Param is being arbitrarily limited in length here.  It is also applied when estimating the size of the payload in getPayloadSize()
        }, QUERY_PARAM_PADDING).substring(1) // remove the leading '&'
      },
      body: stns
    }
  }

  /** When the harvest scheduler finishes, this callback is executed. It's main purpose is to determine if the payload needs to be retried
   * and if so, it will take all data from the temporary buffer and place it back into the traceStorage module
   */
  onHarvestFinished (result) {
    if (result.sent && result.retry && this.sentTrace) { // merge previous trace back into buffer to retry for next harvest
      Object.entries(this.sentTrace).forEach(([name, listOfSTNodes]) => { this.traceStorage.restoreNode(name, listOfSTNodes) })
      this.sentTrace = null
    }
  }

  /** Switch from "off" or "error" to full mode (if entitled) */
  switchToFull () {
    if (this.mode === MODE.FULL || !this.entitled) return
    const prevMode = this.mode
    this.mode = MODE.FULL
    if (prevMode === MODE.OFF && this.initialized) return this.initialize(this.mode, this.entitled, true)
    this.agentRuntime.session.write({ sessionTraceMode: this.mode })
    if (prevMode === MODE.ERROR && this.initialized) {
      this.traceStorage.trimSTNs(ERROR_MODE_SECONDS_WINDOW) // up until now, Trace would've been just buffering nodes up to max, which needs to be trimmed to last X seconds
    }
    this.startHarvesting()
  }

  /** Stop running for the remainder of the page lifecycle */
  abort () {
    this.blocked = true
    this.mode = MODE.OFF
    this.agentRuntime.session.write({ sessionTraceMode: this.mode })
  }
}
