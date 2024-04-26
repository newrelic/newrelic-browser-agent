import { getRuntime, getConfiguration } from '../../../common/config/config'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { FEATURE_NAME, SUPPORTABILITY_METRIC, CUSTOM_METRIC, SUPPORTABILITY_METRIC_CHANNEL, CUSTOM_METRIC_CHANNEL } from '../constants'
import { getFrameworks } from './framework-detection'
import { isFileProtocol } from '../../../common/url/protocol'
import { getRules, validateRules } from '../../../common/util/obfuscate'
import { onDOMContentLoaded } from '../../../common/window/load'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { isBrowserScope, isWorkerScope } from '../../../common/constants/runtime'
import { AggregateBase } from '../../utils/aggregate-base'
import { deregisterDrain } from '../../../common/drain/drain'
import { CONFIG_ASSETS_URL_CHANGED, CONFIG_BEACON_URL_CHANGED, CONFIG_LONG_TASK_ENABLED, CONFIG_SESSION_TRACKING_DISABLED, GENERIC_BF_CACHE_PAGE_RESTORED, GENERIC_DIST_METHOD_CDN_DETECTED, GENERIC_DIST_METHOD_NPM_DETECTED, GENERIC_LOADER_TYPE_AGENT_DETECTED, GENERIC_LOADER_TYPE_BROWSER_AGENT_DETECTED, GENERIC_LOADER_TYPE_EXPERIMENTAL_DETECTED, GENERIC_LOADER_TYPE_LITE_DETECTED, GENERIC_LOADER_TYPE_LITE_POLYFILLS_DETECTED, GENERIC_LOADER_TYPE_PRO_DETECTED, GENERIC_LOADER_TYPE_PRO_POLYFILLS_DETECTED, GENERIC_LOADER_TYPE_SPA_DETECTED, GENERIC_LOADER_TYPE_SPA_POLYFILLS_DETECTED, GENERIC_OBFUSCATE_DETECTED, GENERIC_OBFUSCATE_INVALID, GENERIC_PERFORMANCE_MARK_SEEN, GENERIC_PERFORMANCE_MEASURE_SEEN, GENERIC_RESOURCES_AJAX_EXTERNAL, GENERIC_RESOURCES_AJAX_INTERNAL, GENERIC_RESOURCES_NON_AJAX_EXTERNAL, GENERIC_RESOURCES_NON_AJAX_INTERNAL, GENERIC_RUNTIME_BROWSER_DETECTED, GENERIC_RUNTIME_NONCE_DETECTED, GENERIC_RUNTIME_UNKNOWN_DETECTED, GENERIC_RUNTIME_WORKER_DETECTED, PAGE_SESSION_FEATURE_SESSION_TRACE_DURATION_MS, reportSupportabilityMetric } from '../../utils/supportability-metrics'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.waitForFlags(['err']).then(([errFlag]) => {
      if (errFlag) {
        // *cli, Mar 23 - Per NR-94597, this feature should only harvest ONCE at the (potential) EoL time of the page.
        const scheduler = new HarvestScheduler('jserrors', { onUnload: () => this.unload() }, this)
        // this is needed to ensure EoL is "on" and sent
        scheduler.harvest.on('jserrors', () => ({ body: this.aggregator.take(['cm', 'sm']) }))
        this.drain()
      } else {
        this.blocked = true // if rum response determines that customer lacks entitlements for spa endpoint, this feature shouldn't harvest
        deregisterDrain(this.agentIdentifier, this.featureName)
      }
    })

    // Allow features external to the metrics feature to capture SMs and CMs through the event emitter
    registerHandler(SUPPORTABILITY_METRIC_CHANNEL, this.storeSupportabilityMetrics.bind(this), this.featureName, this.ee)
    registerHandler(CUSTOM_METRIC_CHANNEL, this.storeEventMetrics.bind(this), this.featureName, this.ee)

    this.singleChecks() // checks that are run only one time, at script load
    this.eachSessionChecks() // the start of every time user engages with page
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
    // report loaderType
    const { distMethod, loaderType } = getRuntime(this.agentIdentifier)
    const { proxy, privacy, page_view_timing } = getConfiguration(this.agentIdentifier)

    let loaderTypeTag
    switch (loaderType) {
      case 'agent':
        loaderTypeTag = GENERIC_LOADER_TYPE_AGENT_DETECTED
        break
      case 'browser-agent':
        loaderTypeTag = GENERIC_LOADER_TYPE_BROWSER_AGENT_DETECTED
        break
      case 'experimental':
        loaderTypeTag = GENERIC_LOADER_TYPE_EXPERIMENTAL_DETECTED
        break
      case 'lite':
        loaderTypeTag = GENERIC_LOADER_TYPE_LITE_DETECTED
        break
      case 'pro':
        loaderTypeTag = GENERIC_LOADER_TYPE_PRO_DETECTED
        break
      case 'spa':
        loaderTypeTag = GENERIC_LOADER_TYPE_SPA_DETECTED
        break
      case 'lite-polyfills':
        loaderTypeTag = GENERIC_LOADER_TYPE_LITE_POLYFILLS_DETECTED
        break
      case 'pro-polyfills':
        loaderTypeTag = GENERIC_LOADER_TYPE_PRO_POLYFILLS_DETECTED
        break
      case 'spa-polyfills':
        loaderTypeTag = GENERIC_LOADER_TYPE_SPA_POLYFILLS_DETECTED
        break
    }
    if (loaderTypeTag) reportSupportabilityMetric({ tag: loaderTypeTag }, this.agentIdentifier)

    if (distMethod === 'CDN') reportSupportabilityMetric({ tag: GENERIC_DIST_METHOD_CDN_DETECTED }, this.agentIdentifier)
    if (distMethod === 'NPM') reportSupportabilityMetric({ tag: GENERIC_DIST_METHOD_NPM_DETECTED }, this.agentIdentifier)

    if (isBrowserScope) {
      reportSupportabilityMetric({ tag: GENERIC_RUNTIME_BROWSER_DETECTED })

      const nonce = document?.currentScript?.nonce
      if (nonce && nonce !== '') {
        reportSupportabilityMetric({ tag: GENERIC_RUNTIME_NONCE_DETECTED })
      }

      // These SMs are used by the AppExp team
      onDOMContentLoaded(() => {
        getFrameworks().forEach(frameworkTag => {
          reportSupportabilityMetric({ tag: frameworkTag }, this.agentIdentifier)
        })
      })

      if (!privacy.cookies_enabled) reportSupportabilityMetric({ tag: CONFIG_SESSION_TRACKING_DISABLED }, this.agentIdentifier)
      if (page_view_timing.long_task) reportSupportabilityMetric({ tag: CONFIG_LONG_TASK_ENABLED }, this.agentIdentifier)
    } else if (isWorkerScope) {
      reportSupportabilityMetric({ tag: GENERIC_RUNTIME_WORKER_DETECTED }, this.agentIdentifier)
    } else {
      reportSupportabilityMetric({ tag: GENERIC_RUNTIME_UNKNOWN_DETECTED }, this.agentIdentifier)
    }

    // Track if the agent is being loaded using a file protocol such as is the case in some
    // set-top box applications or Electron applications
    if (isFileProtocol()) {
      this.storeSupportabilityMetrics('Generic/FileProtocol/Detected')
    }

    // Capture SMs to assess customer engagement with the obfuscation config
    const rules = getRules(this.agentIdentifier)
    if (rules.length > 0) reportSupportabilityMetric({ tag: GENERIC_OBFUSCATE_DETECTED }, this.agentIdentifier)
    if (rules.length > 0 && !validateRules(rules)) reportSupportabilityMetric({ tag: GENERIC_OBFUSCATE_INVALID }, this.agentIdentifier)

    // Check if proxy for either chunks or beacon is being used
    if (proxy.assets) reportSupportabilityMetric({ tag: CONFIG_ASSETS_URL_CHANGED }, this.agentIdentifier)
    if (proxy.beacon) reportSupportabilityMetric({ tag: CONFIG_BEACON_URL_CHANGED }, this.agentIdentifier)
  }

  eachSessionChecks () {
    if (!isBrowserScope) return

    // [Temporary] Report restores from BFCache to NR1 while feature flag is in place in lieu of sending pageshow events.
    windowAddEventListener('pageshow', (evt) => {
      if (evt?.persisted) reportSupportabilityMetric({ tag: GENERIC_BF_CACHE_PAGE_RESTORED }, this.agentIdentifier)
    })
  }

  unload () {
    try {
      if (this.resourcesSent) return
      this.resourcesSent = true // make sure this only gets sent once

      const agentRuntime = getRuntime(this.agentIdentifier)

      // Capture SMs around network resources using the performance API to assess
      // work to split this out from the ST nodes
      // differentiate between internal+external and ajax+non-ajax
      const ajaxResources = ['beacon', 'fetch', 'xmlhttprequest']
      const internalUrls = ['nr-data.net', 'newrelic.com', 'nr-local.net', 'localhost']
      function isInternal (x) { return internalUrls.some(y => x.name.indexOf(y) >= 0) }
      function isAjax (x) { return ajaxResources.includes(x.initiatorType) }
      const allResources = performance?.getEntriesByType('resource') || []
      allResources.forEach((entry) => {
        if (isInternal(entry)) {
          if (isAjax(entry)) reportSupportabilityMetric({ tag: GENERIC_RESOURCES_AJAX_INTERNAL }, this.agentIdentifier)
          else reportSupportabilityMetric({ tag: GENERIC_RESOURCES_NON_AJAX_INTERNAL }, this.agentIdentifier)
        } else {
          if (isAjax(entry)) reportSupportabilityMetric({ tag: GENERIC_RESOURCES_AJAX_EXTERNAL }, this.agentIdentifier)
          else reportSupportabilityMetric({ tag: GENERIC_RESOURCES_NON_AJAX_EXTERNAL }, this.agentIdentifier)
        }
      })

      // Capture SMs for session trace if active (`ptid` is set when returned by replay ingest).
      // Retain these SMs while we are working through the session_replay feature
      if (agentRuntime.ptid) {
        reportSupportabilityMetric({ tag: PAGE_SESSION_FEATURE_SESSION_TRACE_DURATION_MS, value: Math.round(performance.now()) }, this.agentIdentifier)
      }

      // Capture SMs for performance markers and measures to assess the usage and possible inclusion of this
      // data in the agent for use in NR
      if (typeof performance !== 'undefined') {
        const markers = performance.getEntriesByType('mark')
        const measures = performance.getEntriesByType('measure')
        reportSupportabilityMetric({ tag: GENERIC_PERFORMANCE_MARK_SEEN, value: markers.length }, this.agentIdentifier)
        reportSupportabilityMetric({ tag: GENERIC_PERFORMANCE_MEASURE_SEEN, value: measures.length }, this.agentIdentifier)
      }
    } catch (e) {
      // do nothing
    }
  }
}
