import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { FEATURE_NAME, SUPPORTABILITY_METRIC, CUSTOM_METRIC, SUPPORTABILITY_METRIC_CHANNEL, CUSTOM_METRIC_CHANNEL/*, WATCHABLE_WEB_SOCKET_EVENTS */ } from '../constants'
import { getFrameworks } from './framework-detection'
import { isFileProtocol } from '../../../common/url/protocol'
import { onDOMContentLoaded } from '../../../common/window/load'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { isBrowserScope, isWorkerScope } from '../../../common/constants/runtime'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_TO_ENDPOINT } from '../../../loaders/features/features'
import { isIFrameWindow } from '../../../common/dom/iframe'
// import { WEBSOCKET_TAG } from '../../../common/wrap/wrap-websocket'
// import { handleWebsocketEvents } from './websocket-detection'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    this.waitForFlags(['err']).then(([errFlag]) => {
      if (errFlag) {
        // *cli, Mar 23 - Per NR-94597, this feature should only harvest ONCE at the (potential) EoL time of the page.
        const scheduler = new HarvestScheduler(FEATURE_TO_ENDPOINT[this.featureName], { onUnload: () => this.unload() }, this)
        // this is needed to ensure EoL is "on" and sent
        scheduler.harvest.on(FEATURE_TO_ENDPOINT[this.featureName], () => ({ body: this.agentRef.sharedAggregator.take(['cm', 'sm']) }))
        this.drain()
      } else {
        this.blocked = true // if rum response determines that customer lacks entitlements for spa endpoint, this feature shouldn't harvest
        this.deregisterDrain()
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
    this.agentRef.sharedAggregator.storeMetric(type, name, params, value)
  }

  storeEventMetrics (name, metrics) {
    if (this.blocked) return
    const type = CUSTOM_METRIC
    const params = { name }
    this.agentRef.sharedAggregator.store(type, name, params, metrics)
  }

  singleChecks () {
    // report loaderType
    const { distMethod, loaderType } = this.agentRef.runtime
    const { proxy, privacy } = this.agentRef.init

    if (loaderType) this.storeSupportabilityMetrics(`Generic/LoaderType/${loaderType}/Detected`)
    if (distMethod) this.storeSupportabilityMetrics(`Generic/DistMethod/${distMethod}/Detected`)

    if (isBrowserScope) {
      this.storeSupportabilityMetrics('Generic/Runtime/Browser/Detected')

      const nonce = document?.currentScript?.nonce
      if (nonce && nonce !== '') {
        this.storeSupportabilityMetrics('Generic/Runtime/Nonce/Detected')
      }

      // These SMs are used by the AppExp team
      onDOMContentLoaded(() => {
        getFrameworks().forEach(framework => {
          this.storeSupportabilityMetrics('Framework/' + framework + '/Detected')
        })
      })

      if (!privacy.cookies_enabled) this.storeSupportabilityMetrics('Config/SessionTracking/Disabled')
    } else if (isWorkerScope) {
      this.storeSupportabilityMetrics('Generic/Runtime/Worker/Detected')
    } else {
      this.storeSupportabilityMetrics('Generic/Runtime/Unknown/Detected')
    }

    // Track if the agent is being loaded using a file protocol such as is the case in some
    // set-top box applications or Electron applications
    if (isFileProtocol()) {
      this.storeSupportabilityMetrics('Generic/FileProtocol/Detected')
    }

    // Capture SMs to assess customer engagement with the obfuscation config
    const ruleValidations = this.obfuscator.ruleValidationCache
    if (ruleValidations.length > 0) {
      this.storeSupportabilityMetrics('Generic/Obfuscate/Detected')
      if (ruleValidations.filter(ruleValidation => !ruleValidation.isValid).length > 0) this.storeSupportabilityMetrics('Generic/Obfuscate/Invalid')
    }

    // Check if proxy for either chunks or beacon is being used
    if (proxy.assets) this.storeSupportabilityMetrics('Config/AssetsUrl/Changed')
    if (proxy.beacon) this.storeSupportabilityMetrics('Config/BeaconUrl/Changed')

    if (isBrowserScope && window.MutationObserver) {
      if (isIFrameWindow(window)) { this.storeSupportabilityMetrics('Generic/Runtime/IFrame/Detected') }
      const preExistingVideos = window.document.querySelectorAll('video').length
      if (preExistingVideos) this.storeSupportabilityMetrics('Generic/VideoElement/Added', preExistingVideos)
      const preExistingIframes = window.document.querySelectorAll('iframe').length
      if (preExistingIframes) this.storeSupportabilityMetrics('Generic/IFrame/Added', preExistingIframes)
      const mo = new MutationObserver(records => {
        records.forEach(record => {
          record.addedNodes.forEach(addedNode => {
            if (addedNode instanceof HTMLVideoElement) { this.storeSupportabilityMetrics('Generic/VideoElement/Added', 1) }
            if (addedNode instanceof HTMLIFrameElement) { this.storeSupportabilityMetrics('Generic/IFrame/Added', 1) }
          })
        })
      })
      mo.observe(window.document.body, { childList: true, subtree: true })
    }

    // WATCHABLE_WEB_SOCKET_EVENTS.forEach(tag => {
    //   registerHandler('buffered-' + WEBSOCKET_TAG + tag, (...args) => {
    //     handleWebsocketEvents(this.storeSupportabilityMetrics.bind(this), tag, ...args)
    //   }, this.featureName, this.ee)
    // })
  }

  eachSessionChecks () {
    if (!isBrowserScope) return

    // [Temporary] Report restores from BFCache to NR1 while feature flag is in place in lieu of sending pageshow events.
    windowAddEventListener('pageshow', (evt) => {
      if (evt?.persisted) { this.storeSupportabilityMetrics('Generic/BFCache/PageRestored') }
    })
  }

  unload () {
    try {
      if (this.resourcesSent) return
      this.resourcesSent = true // make sure this only gets sent once

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
          if (isAjax(entry)) this.storeSupportabilityMetrics('Generic/Resources/Ajax/Internal')
          else this.storeSupportabilityMetrics('Generic/Resources/Non-Ajax/Internal')
        } else {
          if (isAjax(entry)) this.storeSupportabilityMetrics('Generic/Resources/Ajax/External')
          else this.storeSupportabilityMetrics('Generic/Resources/Non-Ajax/External')
        }
      })

      // Capture SMs for performance markers and measures to assess the usage and possible inclusion of this
      // data in the agent for use in NR
      if (typeof performance !== 'undefined') {
        const markers = performance.getEntriesByType('mark')
        const measures = performance.getEntriesByType('measure')
        if (markers.length) this.storeSupportabilityMetrics('Generic/Performance/Mark/Seen', markers.length)
        if (measures.length) this.storeSupportabilityMetrics('Generic/Performance/Measure/Seen', measures.length)
      }
    } catch (e) {
      // do nothing
    }
  }
}
