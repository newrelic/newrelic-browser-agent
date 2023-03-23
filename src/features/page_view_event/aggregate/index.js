import { handle } from '../../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { isiOS } from '../../../common/browser-version/ios-version'
import { onTTFB } from 'web-vitals'
import { mapOwn } from '../../../common/util/map-own'
import { param, fromArray } from '../../../common/url/encode'
import { addPT, addPN } from '../../../common/timing/nav-timing'
import { stringify } from '../../../common/util/stringify'
import { paintMetrics } from '../../../common/metrics/paint-metrics'
import { submitData } from '../../../common/util/submit-data'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import * as CONSTANTS from '../constants'
import { getActivatedFeaturesFlags } from './initialized-features'
import { globalScope, isBrowserScope } from '../../../common/util/global-scope'
import { drain } from '../../../common/drain/drain'

const jsonp = 'NREUM.setToken'

export class Aggregate extends AggregateBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, CONSTANTS.FEATURE_NAME)

    if (typeof PerformanceNavigationTiming !== 'undefined' && !isiOS) {
      this.alreadySent = false // we don't support timings on BFCache restores
      const agentRuntime = getRuntime(agentIdentifier) // we'll store timing values on the runtime obj to be read by the aggregate module

      /* Time To First Byte
        This listener must record these values *before* PVE's aggregate sends RUM. */
      onTTFB(({ value, entries }) => {
        if (this.alreadySent) return
        this.alreadySent = true

        agentRuntime[CONSTANTS.TTFB] = Math.round(value) // this is our "backend" duration; web-vitals will ensure it's lower bounded at 0

        // Similar to what vitals does for ttfb, we have to factor in activation-start when calculating relative timings:
        const navEntry = entries[0]
        const respOrActivStart = Math.max(navEntry.responseStart, navEntry.activationStart || 0)
        agentRuntime[CONSTANTS.FBTWL] = Math.max(Math.round(navEntry.loadEventEnd - respOrActivStart), 0) // our "frontend" duration
        handle('timing', ['load', Math.round(navEntry.loadEventEnd)], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
        agentRuntime[CONSTANTS.FBTDC] = Math.max(Math.round(navEntry.domContentLoadedEventEnd - respOrActivStart), 0) // our "dom processing" duration

        this.sendRum()
      })
    } else {
      this.sendRum() // timings either already in runtime from instrument or is meant to get 0'd.
    }
  }

  getScheme () {
    return getConfigurationValue(this.agentIdentifier, 'ssl') === false ? 'http' : 'https'
  }

  sendRum () {
    const info = getInfo(this.agentIdentifier)
    if (!info.beacon) return
    if (info.queueTime) this.aggregator.store('measures', 'qt', { value: info.queueTime })
    if (info.applicationTime) this.aggregator.store('measures', 'ap', { value: info.applicationTime })
    const agentRuntime = getRuntime(this.agentIdentifier)

    // These 3 values should've been recorded after load and before this func runs. They are part of the minimum required for PageView events to be created.
    // Following PR #428, which demands that all agents send RUM call, these need to be sent even outside of the main window context where PerformanceTiming
    // or PerformanceNavigationTiming do not exists. Hence, they'll be filled in by 0s instead in, for example, worker threads that still init the PVE module.
    this.aggregator.store('measures', 'be', { value: isBrowserScope ? agentRuntime[CONSTANTS.TTFB] : 0 })
    this.aggregator.store('measures', 'fe', { value: isBrowserScope ? agentRuntime[CONSTANTS.FBTWL] : 0 })
    this.aggregator.store('measures', 'dc', { value: isBrowserScope ? agentRuntime[CONSTANTS.FBTDC] : 0 })

    var measuresMetrics = this.aggregator.get('measures')

    var measuresQueryString = mapOwn(measuresMetrics, function (metricName, measure) {
      return '&' + metricName + '=' + measure.params.value
    }).join('')

    // currently we only have one version of our protocol
    // in the future we may add more
    var protocol = '1'

    var scheduler = new HarvestScheduler('page_view_event', {}, this)

    var chunksForQueryString = [scheduler.harvest.baseQueryString()]

    chunksForQueryString.push(measuresQueryString)

    chunksForQueryString.push(param('tt', info.ttGuid))
    chunksForQueryString.push(param('us', info.user))
    chunksForQueryString.push(param('ac', info.account))
    chunksForQueryString.push(param('pr', info.product))
    chunksForQueryString.push(param('af', getActivatedFeaturesFlags(this.agentIdentifier).join(',')))

    if (globalScope.performance && typeof (globalScope.performance.timing) !== 'undefined') {
      var navTimingApiData = ({
        timing: addPT(agentRuntime.offset, globalScope.performance.timing, {}),
        navigation: addPN(globalScope.performance.navigation, {})
      })
      chunksForQueryString.push(param('perf', stringify(navTimingApiData)))
    }

    try { // PVTiming sends these too, albeit using web-vitals and slightly different; it's unknown why they're duplicated, but PVT should be the truth
      var entries = globalScope.performance.getEntriesByType('paint')
      entries.forEach(function (entry) {
        if (!entry.startTime || entry.startTime <= 0) return

        if (entry.name === 'first-paint') {
          chunksForQueryString.push(param('fp', String(Math.floor(entry.startTime))))
        } else if (entry.name === 'first-contentful-paint') {
          chunksForQueryString.push(param('fcp', String(Math.floor(entry.startTime))))
        }
        paintMetrics[entry.name] = Math.floor(entry.startTime) // this is consumed by Spa module
      })
    } catch (e) {}

    chunksForQueryString.push(param('xx', info.extra))
    chunksForQueryString.push(param('ua', info.userAttributes))
    chunksForQueryString.push(param('at', info.atts))

    var customJsAttributes = stringify(info.jsAttributes)
    chunksForQueryString.push(param('ja', customJsAttributes === '{}' ? null : customJsAttributes))

    var queryString = fromArray(chunksForQueryString, agentRuntime.maxBytes)
    const isValidJsonp = submitData.jsonp(
      this.getScheme() + '://' + info.beacon + '/' + protocol + '/' + info.licenseKey + queryString,
      jsonp
    )
    // Usually `drain` is invoked automatically after processing feature flags contained in the JSONP callback from
    // ingest (see `activateFeatures`), so when JSONP cannot execute (as with module workers), we drain manually.
    if (!isValidJsonp) drain(this.agentIdentifier, CONSTANTS.FEATURE_NAME)
  }
}
