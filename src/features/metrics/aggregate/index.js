import { getRuntime } from '../../../common/config/config'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME, SUPPORTABILITY_METRIC, CUSTOM_METRIC, SUPPORTABILITY_METRIC_CHANNEL, CUSTOM_METRIC_CHANNEL } from '../constants'
import { drain } from '../../../common/drain/drain'
import { getFrameworks } from '../../../common/metrics/framework-detection'
import { isFileProtocol } from '../../../common/url/protocol'
import { getRules, validateRules } from '../../../common/util/obfuscate'
import { VERSION } from '../../../common/constants/env'
import { onDOMContentLoaded } from '../../../common/window/load'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { isBrowserScope } from '../../../common/util/global-scope'
import { metrics, type } from './session-replay-investigation'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    let scheduler

    // If RUM-call's response determines that customer lacks entitlements for the /jserror ingest endpoint, don't harvest at all.
    registerHandler('block-err', () => {
      this.blocked = true
      if (scheduler) scheduler.aborted = true // RUM response may or may not have happened already before scheduler initialization below
    }, this.featureName, this.ee)

    // Allow features external to the metrics feature to capture SMs and CMs through the event emitter
    registerHandler(SUPPORTABILITY_METRIC_CHANNEL, this.storeSupportabilityMetrics.bind(this), this.featureName, this.ee)
    registerHandler(CUSTOM_METRIC_CHANNEL, this.storeEventMetrics.bind(this), this.featureName, this.ee)

    this.singleChecks() // checks that are run only one time, at script load
    this.eachSessionChecks() // the start of every time user engages with page

    // *cli, Mar 23 - Per NR-94597, this feature should only harvest ONCE at the (potential) EoL time of the page.
    scheduler = new HarvestScheduler('jserrors', { onUnload: () => this.unload() }, this)
    scheduler.harvest.on('jserrors', () => ({ body: this.aggregator.take(['cm', 'sm']) }))

    drain(this.agentIdentifier, this.featureName) // regardless if this is blocked or not, drain is needed to unblock other features from harvesting (counteract registerDrain)
  }

  storeSupportabilityMetrics (name, value) {
    if (this.blocked) return
    const type = SUPPORTABILITY_METRIC
    const params = { name }
    this.aggregator.storeMetric(type, name, params, value)
  }

  storeEventMetrics (name, metrics) {
    if (this.blocked) return
    const type = CUSTOM_METRIC
    const params = { name }
    this.aggregator.store(type, name, params, metrics)
  }

  singleChecks () {
    // report generic info about the agent itself
    // note the browser agent version
    this.storeSupportabilityMetrics(`Generic/Version/${VERSION}/Detected`)
    // report loaderType
    const { distMethod, loaderType } = getRuntime(this.agentIdentifier)
    if (loaderType) this.storeSupportabilityMetrics(`Generic/LoaderType/${loaderType}/Detected`)
    if (distMethod) this.storeSupportabilityMetrics(`Generic/DistMethod/${distMethod}/Detected`)

    // frameworks on page
    if (isBrowserScope) {
      onDOMContentLoaded(() => {
        getFrameworks().forEach(framework => {
          this.storeSupportabilityMetrics('Framework/' + framework + '/Detected')
        })
      })
    }

    // file protocol detection
    if (isFileProtocol()) {
      this.storeSupportabilityMetrics('Generic/FileProtocol/Detected')
    }

    // obfuscation rules detection
    const rules = getRules(this.agentIdentifier)
    if (rules.length > 0) this.storeSupportabilityMetrics('Generic/Obfuscate/Detected')
    if (rules.length > 0 && !validateRules(rules)) this.storeSupportabilityMetrics('Generic/Obfuscate/Invalid')
  }

  eachSessionChecks () {
    if (!isBrowserScope) return

    // [Temporary] Report restores from BFCache to NR1 while feature flag is in place in lieu of sending pageshow events.
    windowAddEventListener('pageshow', (evt) => {
      if (evt.persisted) { this.storeSupportabilityMetrics('Generic/BFCache/PageRestored') }
      return
    })
  }

  unload () {
    // Page Resources detection for estimations with resources feature work
    // TODO - these SMs are to be removed when we implement the actual resources feature
    try {
      if (this.resourcesSent) return
      const agentRuntime = getRuntime(this.agentIdentifier)
      // make sure this only gets sent once
      this.resourcesSent = true
      // differentiate between internal+external and ajax+non-ajax
      const ajaxResources = ['beacon', 'fetch', 'xmlhttprequest']
      const internalUrls = ['nr-data.net', 'newrelic.com', 'nr-local.net', 'localhost']
      function isInternal (x) { return internalUrls.some(y => x.name.indexOf(y) >= 0) }
      function isAjax (x) { return ajaxResources.includes(x.initiatorType) }
      const allResources = performance?.getEntriesByType('resource') || []
      allResources.forEach((entry) => {
        if (isInternal(entry)) {
          if (isAjax(entry)) this.storeSupportabilityMetrics('Generic/Resources/Ajax/Internal')
          else this.storeSupportabilityMetrics('Generic/Resources/Non-Ajax/Internal')
        } else {
          if (isAjax(entry)) this.storeSupportabilityMetrics('Generic/Resources/Ajax/External')
          else this.storeSupportabilityMetrics('Generic/Resources/Non-Ajax/External')
        }
      })

      // Capture per-agent bytes sent for each endpoint (see harvest) and RUM call (see page_view_event aggregator).
      Object.keys(agentRuntime.bytesSent).forEach(endpoint => {
        this.storeSupportabilityMetrics(
          `PageSession/Endpoint/${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}/BytesSent`,
          agentRuntime.bytesSent[endpoint]
        )
      })

      // Capture metrics for session trace if active (`ptid` is set when returned by replay ingest).
      if (agentRuntime.ptid) {
        this.storeSupportabilityMetrics('PageSession/Feature/SessionTrace/DurationMs', Math.round(performance.now()))
      }

      // Capture metrics for session replay, if they exist (non zero values)
      Object.entries(metrics).forEach(([key, val]) => {
        // PageSession/Feature/SessionReplay/Spa/Nodes
        // PageSession/Feature/SessionReplay/Spa/Bytes
        // PageSession/Feature/SessionReplay/Spa/InitialSnapshotBytes
        // PageSession/Feature/SessionReplay/Spa/InitialSnapshotBytesCompressed
        // PageSession/Feature/SessionReplay/Spa/BytesPerMinute
        // ---- or ----
        // PageSession/Feature/SessionReplay/Standard/Nodes
        // PageSession/Feature/SessionReplay/Standard/Bytes
        // PageSession/Feature/SessionReplay/Standard/InitialSnapshotBytes
        // PageSession/Feature/SessionReplay/Standard/InitialSnapshotBytesCompressed
        // PageSession/Feature/SessionReplay/Standard/BytesPerMinute
        if (val > 0) this.storeSupportabilityMetrics(`PageSession/Feature/SessionReplay/${key}/${type}`, val)
      })
    } catch (e) {
      // do nothing
    }
  }
}
