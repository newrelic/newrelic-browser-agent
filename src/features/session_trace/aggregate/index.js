import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { FEATURE_NAME } from '../constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { TraceStorage } from './trace/storage'
import { obj as encodeObj } from '../../../common/url/encode'
import { globalScope } from '../../../common/constants/runtime'
import { MODE, SESSION_EVENTS } from '../../../common/session/constants'
import { applyFnToProps } from '../../../common/util/traverse'
import { FEATURE_TO_ENDPOINT } from '../../../loaders/features/features'
import { cleanURL } from '../../../common/url/clean-url'

const ERROR_MODE_SECONDS_WINDOW = 30 * 1000 // sliding window of nodes to track when simply monitoring (but not harvesting) in error mode
/** Reserved room for query param attrs */
const QUERY_PARAM_PADDING = 5000
export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME

  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    this.harvestTimeSeconds = agentRef.init.session_trace.harvestTimeSeconds || 30
    /** Tied to the entitlement flag response from BCS.  Will short circuit operations of the agg if false  */
    this.entitled = undefined
    /** A flag used to decide if the 30 node threshold should be ignored on the first harvest to ensure sending on the first payload */
    this.everHarvested = false
    /** If the harvest module is harvesting */
    this.harvesting = false
    /** TraceStorage is the mechanism that holds, normalizes and aggregates ST nodes.  It will be accessed and purged when harvests occur */
    this.events = new TraceStorage(this)
    /** This agg needs information about sampling (sts) and entitlements (st) to make the appropriate decisions on running */
    this.waitForFlags(['sts', 'st'])
      .then(([stMode, stEntitled]) => this.initialize(stMode, stEntitled))
  }

  /** Sets up event listeners, and initializes this module to run in the correct "mode".  Can be triggered from a few places, but makes an effort to only set up listeners once */
  initialize (stMode, stEntitled, ignoreSession) {
    this.entitled ??= stEntitled
    if (this.blocked || !this.entitled) return this.deregisterDrain()

    if (!this.initialized) {
      this.initialized = true
      /** Store session identifiers at initialization time to be cross-checked later at harvest time for session changes that are subject to race conditions */
      this.ptid = this.agentRef.runtime.ptid
      this.sessionId = this.agentRef.runtime.session?.state.value
      // The SessionEntity class can emit a message indicating the session was cleared and reset (expiry, inactivity). This feature must abort and never resume if that occurs.
      this.ee.on(SESSION_EVENTS.RESET, () => {
        if (this.blocked) return
        this.abort(1)
      })
      // The SessionEntity can have updates (locally or across tabs for SR mode changes), (across tabs for ST mode changes).
      // Those updates should be sync'd here to ensure this page also honors the mode after initialization
      this.ee.on(SESSION_EVENTS.UPDATE, (eventType, sessionState) => {
        if (this.blocked) return
        // this will only have an effect if ST is NOT already in full mode
        if (this.mode !== MODE.FULL && (sessionState.sessionReplayMode === MODE.FULL || sessionState.sessionTraceMode === MODE.FULL)) this.switchToFull()
        // if another page's session entity has expired, or another page has transitioned to off and this one hasn't... we can just abort straight away here
        if (this.sessionId !== sessionState.value || (eventType === 'cross-tab' && this.scheduler?.started && sessionState.sessionTraceMode === MODE.OFF)) this.abort(2)
      })

      if (typeof PerformanceNavigationTiming !== 'undefined') {
        this.events.storeTiming(globalScope.performance?.getEntriesByType?.('navigation')[0])
      } else {
        this.events.storeTiming(globalScope.performance?.timing, true)
      }
    }

    /** ST/SR sampling flow in BCS - https://drive.google.com/file/d/19hwt2oft-8Hh4RrjpLqEXfpP_9wYBLcq/view?usp=sharing */
    /** ST will run in the mode provided by BCS if the session IS NEW.  If not... it will use the state of the session entity to determine what mode to run in */
    if (!this.agentRef.runtime.session.isNew && !ignoreSession) this.mode = this.agentRef.runtime.session.state.sessionTraceMode
    else this.mode = stMode

    /** If the mode is off, we do not want to hold up draining for other features, so we deregister the feature for now.
     * If it drains later (due to a mode change), data and handlers will instantly drain instead of waiting for the registry. */
    if (this.mode === MODE.OFF) return this.deregisterDrain()

    this.timeKeeper ??= this.agentRef.runtime.timeKeeper

    this.scheduler = new HarvestScheduler(FEATURE_TO_ENDPOINT[this.featureName], {
      onFinished: (result) => this.postHarvestCleanup(result.sent && result.retry),
      retryDelay: this.harvestTimeSeconds,
      getPayload: (options) => this.makeHarvestPayload(options.retry),
      raw: true
    }, this)

    /** The handlers set up by the Inst file */
    registerHandler('bst', (...args) => this.events.storeEvent(...args), this.featureName, this.ee)
    registerHandler('bstResource', (...args) => this.events.storeResources(...args), this.featureName, this.ee)
    registerHandler('bstHist', (...args) => this.events.storeHist(...args), this.featureName, this.ee)
    registerHandler('bstXhrAgg', (...args) => this.events.storeXhrAgg(...args), this.featureName, this.ee)
    registerHandler('bstApi', (...args) => this.events.storeSTN(...args), this.featureName, this.ee)
    registerHandler('trace-jserror', (...args) => this.events.storeErrorAgg(...args), this.featureName, this.ee)
    registerHandler('pvtAdded', (...args) => this.events.processPVT(...args), this.featureName, this.ee)

    /** Only start actually harvesting if running in full mode at init time */
    if (this.mode === MODE.FULL) this.startHarvesting()
    else {
      /** A separate handler for noticing errors, and switching to "full" mode if running in "error" mode */
      registerHandler('trace-jserror', () => {
        if (this.mode === MODE.ERROR) this.switchToFull()
      }, this.featureName, this.ee)
    }
    this.agentRef.runtime.session.write({ sessionTraceMode: this.mode })
    this.drain()
  }

  /** This module does not auto harvest by default -- it needs to be kicked off.  Once this method is called, it will then harvest on an interval */
  startHarvesting () {
    if (this.scheduler.started || this.blocked) return
    this.scheduler.runHarvest()
    this.scheduler.startTimer(this.harvestTimeSeconds)
  }

  preHarvestChecks () {
    if (this.mode !== MODE.FULL) return // only allow harvest if running in full mode
    if (!this.timeKeeper?.ready) return // this should likely never happen, but just to be safe, we should never harvest if we cant correct time
    if (!this.agentRef.runtime.session) return // session entity is required for trace to run and continue running
    if (this.sessionId !== this.agentRef.runtime.session.state.value || this.ptid !== this.agentRef.runtime.ptid) {
      // If something unexpected happened and we somehow still got to harvesting after a session identifier changed, we should force-exit instead of harvesting:
      this.abort(3)
      return
    }
    return true
  }

  serializer ({ stns }) {
    if (!stns.length) return // there are no processed nodes
    this.everHarvested = true
    return applyFnToProps(stns, this.obfuscator.obfuscateString.bind(this.obfuscator), 'string')
  }

  queryStringsBuilder ({ stns, earliestTimeStamp, latestTimeStamp }) {
    const firstSessionHarvest = !this.agentRef.runtime.session.state.traceHarvestStarted
    if (firstSessionHarvest) this.agentRef.runtime.session.write({ traceHarvestStarted: true })
    const hasReplay = this.agentRef.runtime.session.state.sessionReplayMode === 1
    const endUserId = this.agentRef.info.jsAttributes['enduser.id']
    const entityGuid = this.agentRef.runtime.appMetadata.agents?.[0]?.entityGuid

    /* The blob consumer expects the following and will reject if not supplied:
     * browser_monitoring_key
     * type
     * app_id
     * protocol_version
     * attributes
     *
     * For data that does not fit the schema of the above, it should be url-encoded and placed into `attributes`
     */

    return {
      browser_monitoring_key: this.agentRef.info.licenseKey,
      type: 'BrowserSessionChunk',
      app_id: this.agentRef.info.applicationID,
      protocol_version: '0',
      timestamp: Math.floor(this.timeKeeper.correctRelativeTimestamp(earliestTimeStamp)),
      attributes: encodeObj({
        ...(entityGuid && { entityGuid }),
        harvestId: `${this.agentRef.runtime.session.state.value}_${this.agentRef.runtime.ptid}_${this.agentRef.runtime.harvestCount}`,
        // this section of attributes must be controllable and stay below the query param padding limit -- see QUERY_PARAM_PADDING
        // if not, data could be lost to truncation at time of sending, potentially breaking parsing / API behavior in NR1
        // trace payload metadata
        'trace.firstTimestamp': Math.floor(this.timeKeeper.correctRelativeTimestamp(earliestTimeStamp)),
        'trace.lastTimestamp': Math.floor(this.timeKeeper.correctRelativeTimestamp(latestTimeStamp)),
        'trace.nodes': stns.length,
        'trace.originTimestamp': this.timeKeeper.correctedOriginTime,
        // other payload metadata
        agentVersion: this.agentRef.runtime.version,
        ...(firstSessionHarvest && { firstSessionHarvest }),
        ...(hasReplay && { hasReplay }),
        ptid: `${this.ptid}`,
        session: `${this.sessionId}`,
        // customer-defined data should go last so that if it exceeds the query param padding limit it will be truncated instead of important attrs
        ...(endUserId && { 'enduser.id': this.obfuscator.obfuscateString(endUserId) }),
        currentUrl: this.obfuscator.obfuscateString(cleanURL('' + location))
        // The Query Param is being arbitrarily limited in length here.  It is also applied when estimating the size of the payload in getPayloadSize()
      }, QUERY_PARAM_PADDING).substring(1) // remove the leading '&'
    }
  }

  /** Switch from "off" or "error" to full mode (if entitled) */
  switchToFull () {
    if (this.mode === MODE.FULL || !this.entitled || this.blocked) return
    const prevMode = this.mode
    this.mode = MODE.FULL
    this.agentRef.runtime.session.write({ sessionTraceMode: this.mode })
    if (prevMode === MODE.OFF || !this.initialized) return this.initialize(this.mode, this.entitled)
    if (this.initialized) {
      this.events.trimSTNs(ERROR_MODE_SECONDS_WINDOW) // up until now, Trace would've been just buffering nodes up to max, which needs to be trimmed to last X seconds
    }
    this.startHarvesting()
  }

  /** Stop running for the remainder of the page lifecycle */
  abort () {
    this.blocked = true
    this.mode = MODE.OFF
    this.agentRef.runtime.session.write({ sessionTraceMode: this.mode })
    this.scheduler?.stopTimer()
    this.events.clear()
  }

  /**
   * Cleanup task after a harvest.
   * @param {Boolean} harvestFailed - harvester flag to restore events in main buffer for retry later if request failed
   */
  postHarvestCleanup (harvestFailed = false, opts = {}) {
    if (harvestFailed) this.events.reloadSave(opts)
    this.events.clearSave(opts)
  }

  /**
   * Return harvest payload. A "serializer" function can be defined on a derived class to format the payload.
   * @param {Boolean} shouldRetryOnFail - harvester flag to backup payload for retry later if harvest request fails; this should be moved to harvester logic
   * @returns final payload, or undefined if there are no pending events
   */
  makeHarvestPayload (shouldRetryOnFail = false, opts = {}) {
    const target = { licenseKey: this.agentRef.info.licenseKey, applicationID: this.agentRef.info.applicationID }
    if (this.events.isEmpty(opts)) return [{ target, payload: undefined }]
    // Other conditions and things to do when preparing harvest that is required.
    if (this.preHarvestChecks && !this.preHarvestChecks()) return [{ target, payload: undefined }]

    if (shouldRetryOnFail) this.events.save(opts)
    const returnedData = this.events.get(opts)
    // A serializer or formatter assists in creating the payload `body` from stored events on harvest when defined by derived feature class.
    const body = this.serializer(returnedData)
    this.events.clear(opts)

    const payload = {
      body
    }
    // Constructs the payload `qs` for relevant features on harvest.
    payload.qs = this.queryStringsBuilder(returnedData)

    // console.log('got payload', payload)
    return [{ target: { licenseKey: this.agentRef.info.licenseKey, applicationID: this.agentRef.info.applicationID }, payload }]
  }
}
