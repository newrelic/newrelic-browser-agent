import { getConfigurationValue, getRuntime } from '../../../common/config/config'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME, SUPPORTABILITY_METRIC, CUSTOM_METRIC, SUPPORTABILITY_METRIC_CHANNEL, CUSTOM_METRIC_CHANNEL } from '../constants'
import { drain } from '../../../common/drain/drain'
import { getFrameworks } from '../../../common/metrics/framework-detection'
import { protocol } from '../../../common/url/protocol'
import { getRules, validateRules } from '../../../common/util/obfuscate'
import { VERSION } from '../../../common/constants/environment-variables'
import { onDOMContentLoaded } from '../../../common/window/load'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { isBrowserScope } from '../../../common/util/global-scope'
export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    // Allow features external to the metrics feature to capture SMs and CMs through the event emitter
    registerHandler(SUPPORTABILITY_METRIC_CHANNEL, this.storeSupportabilityMetrics.bind(this), this.featureName, this.ee)
    registerHandler(CUSTOM_METRIC_CHANNEL, this.storeEventMetrics.bind(this), this.featureName, this.ee)

    this.singleChecks() // checks that are run only one time, at script load
    this.eachSessionChecks() // the start of every time user engages with page

    var harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'metrics.harvestTimeSeconds') || 30

    var scheduler = new HarvestScheduler('jserrors', {}, this)
    scheduler.harvest.on('jserrors', () => ({ body: this.aggregator.take(['cm', 'sm']) }))
    this.ee.on(`drain-${this.featureName}`, () => { if (!this.blocked) scheduler.startTimer(harvestTimeSeconds) })

    // if rum response determines that customer lacks entitlements for err endpoint, block it
    registerHandler('block-err', () => {
      this.blocked = true
      scheduler.stopTimer()
    }, this.featureName, this.ee)

    drain(this.agentIdentifier, this.featureName)
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
    const { loaderType } = getRuntime(this.agentIdentifier)
    if (loaderType) this.storeSupportabilityMetrics(`Generic/LoaderType/${loaderType}/Detected`)

    // frameworks on page
    if (isBrowserScope) { onDOMContentLoaded(() => {
      getFrameworks().forEach(framework => {
        this.storeSupportabilityMetrics('Framework/' + framework + '/Detected')
      })
    }) }

    // file protocol detection
    if (protocol.isFileProtocol()) {
      this.storeSupportabilityMetrics('Generic/FileProtocol/Detected')
      protocol.supportabilityMetricSent = true
    }

    // obfuscation rules detection
    const rules = getRules(this.agentIdentifier)
    if (rules.length > 0) this.storeSupportabilityMetrics('Generic/Obfuscate/Detected')
    if (rules.length > 0 && !validateRules(rules)) this.storeSupportabilityMetrics('Generic/Obfuscate/Invalid')

    // don't track usage of AJAX type resources, these are already accounted for by the AJAX feature
    // differentiate between external only and resources that include fetching the browser agent itself
    const invalidResources = ['beacon', 'fetch', 'xmlhttprequest']
    const internalUrls = ['nr-data.net', 'newrelic.com', 'nr-local.net']
    const allResources = performance?.getEntriesByType('resource').filter(x => !invalidResources.includes(x.initiatorType))
    const externalResources = allResources.filter(x => internalUrls.every(y => !x.name.includes(y)))
    this.storeSupportabilityMetrics('Generic/Resources/External', externalResources.length)
    this.storeSupportabilityMetrics('Generic/Resources/All', allResources.length)
  }

  eachSessionChecks () {
    if (!isBrowserScope) return

    // [Temporary] Report restores from BFCache to NR1 while feature flag is in place in lieu of sending pageshow events.
    windowAddEventListener('pageshow', (evt) => {
      if (evt.persisted)
      { this.storeSupportabilityMetrics('Generic/BFCache/PageRestored') }
      return
    })
  }
}
