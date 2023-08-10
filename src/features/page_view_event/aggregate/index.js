import { handle } from '../../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { isiOS, globalScope, isBrowserScope } from '../../../common/constants/runtime'
import { onTTFB } from 'web-vitals'
import { addPT, addPN } from '../../../common/timing/nav-timing'
import { stringify } from '../../../common/util/stringify'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { Harvest } from '../../../common/harvest/harvest'
import * as CONSTANTS from '../constants'
import { getActivatedFeaturesFlags } from './initialized-features'
import { drain } from '../../../common/drain/drain'
import { activateFeatures } from '../../../common/util/feature-flags'
import { warn } from '../../../common/util/console'
import { AggregateBase } from '../../utils/aggregate-base'
import { firstContentfulPaint } from '../../../common/vitals/first-contentful-paint'
import { firstPaint } from '../../../common/vitals/first-paint'

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
    const agentRuntime = getRuntime(this.agentIdentifier)

    if (!info.beacon) return
    if (info.queueTime) this.aggregator.store('measures', 'qt', { value: info.queueTime })
    if (info.applicationTime) this.aggregator.store('measures', 'ap', { value: info.applicationTime })

    // These 3 values should've been recorded after load and before this func runs. They are part of the minimum required for PageView events to be created.
    // Following PR #428, which demands that all agents send RUM call, these need to be sent even outside of the main window context where PerformanceTiming
    // or PerformanceNavigationTiming do not exists. Hence, they'll be filled in by 0s instead in, for example, worker threads that still init the PVE module.
    this.aggregator.store('measures', 'be', { value: isBrowserScope ? agentRuntime[CONSTANTS.TTFB] : 0 })
    this.aggregator.store('measures', 'fe', { value: isBrowserScope ? agentRuntime[CONSTANTS.FBTWL] : 0 })
    this.aggregator.store('measures', 'dc', { value: isBrowserScope ? agentRuntime[CONSTANTS.FBTDC] : 0 })

    const queryParameters = {
      tt: info.ttGuid,
      us: info.user,
      ac: info.account,
      pr: info.product,
      af: getActivatedFeaturesFlags(this.agentIdentifier).join(','),
      ...(
        Object.entries(this.aggregator.get('measures') || {}).reduce((aggregator, [metricName, measure]) => {
          aggregator[metricName] = measure.params?.value
          return aggregator
        }, {})
      ),
      xx: info.extra,
      ua: info.userAttributes,
      at: info.atts
    }

    let body
    if (typeof info.jsAttributes === 'object' && Object.keys(info.jsAttributes).length > 0) {
      body = { ja: info.jsAttributes }
    }

    if (globalScope.performance) {
      if (typeof PerformanceNavigationTiming !== 'undefined') { // Navigation Timing level 2 API that replaced PerformanceTiming & PerformanceNavigation
        const navTimingEntry = globalScope?.performance?.getEntriesByType('navigation')?.[0]
        const perf = ({
          timing: addPT(agentRuntime.offset, navTimingEntry, {}),
          navigation: addPN(navTimingEntry, {})
        })
        queryParameters.perf = stringify(perf)
      } else if (typeof PerformanceTiming !== 'undefined') { // Safari pre-15 did not support level 2 timing
        const perf = ({
          timing: addPT(agentRuntime.offset, globalScope.performance.timing, {}, true),
          navigation: addPN(globalScope.performance.navigation, {})
        })
        queryParameters.perf = stringify(perf)
      }
    }

    queryParameters.fp = firstPaint.value.current
    queryParameters.fcp = firstContentfulPaint.value.current

    this.harvest({ queryParameters, body })
  }

  harvest ({ queryParameters, body }) {
    const harvester = new Harvest(this)
    harvester.send({
      endpoint: 'rum',
      payload: { qs: queryParameters, body },
      opts: { needResponse: true, sendEmptyBody: true },
      cbFinished: ({ status, responseText }) => {
        if (status >= 400) {
          // Adding retry logic for the rum call will be a separate change
          this.ee.abort()
          return
        }

        try {
          activateFeatures(JSON.parse(responseText), this.agentIdentifier)
          drain(this.agentIdentifier, this.featureName)
        } catch (err) {
          this.ee.abort()
          warn('RUM call failed. Agent shutting down.')
        }
      }
    })
  }
}
