import { globalScope, isBrowserScope } from '../../../common/constants/runtime'
import { addPT, addPN } from '../../../common/timing/nav-timing'
import { stringify } from '../../../common/util/stringify'
import { getInfo, getRuntime } from '../../../common/config/config'
import { Harvest } from '../../../common/harvest/harvest'
import * as CONSTANTS from '../constants'
import { getActivatedFeaturesFlags } from './initialized-features'
import { activateFeatures } from '../../../common/util/feature-flags'
import { warn } from '../../../common/util/console'
import { AggregateBase } from '../../utils/aggregate-base'
import { firstContentfulPaint } from '../../../common/vitals/first-contentful-paint'
import { firstPaint } from '../../../common/vitals/first-paint'
import { timeToFirstByte } from '../../../common/vitals/time-to-first-byte'

export class Aggregate extends AggregateBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, CONSTANTS.FEATURE_NAME)

    this.timeToFirstByte = 0
    this.firstByteToWindowLoad = 0 // our "frontend" duration
    this.firstByteToDomContent = 0 // our "dom processing" duration

    if (isBrowserScope) {
      timeToFirstByte.subscribe(({ value, entries }) => {
        const navEntry = entries[0]
        this.timeToFirstByte = Math.max(value, this.timeToFirstByte)
        this.firstByteToWindowLoad = Math.max(Math.round(navEntry.loadEventEnd - this.timeToFirstByte), this.firstByteToWindowLoad) // our "frontend" duration
        this.firstByteToDomContent = Math.max(Math.round(navEntry.domContentLoadedEventEnd - this.timeToFirstByte), this.firstByteToDomContent) // our "dom processing" duration

        this.sendRum()
      })
    } else {
      // worker agent build does not get TTFB values, use default 0 values
      this.sendRum()
    }
  }

  sendRum () {
    const info = getInfo(this.agentIdentifier)
    const agentRuntime = getRuntime(this.agentIdentifier)
    const harvester = new Harvest(this)

    if (!info.beacon) return
    if (info.queueTime) this.aggregator.store('measures', 'qt', { value: info.queueTime })
    if (info.applicationTime) this.aggregator.store('measures', 'ap', { value: info.applicationTime })

    // These 3 values should've been recorded after load and before this func runs. They are part of the minimum required for PageView events to be created.
    // Following PR #428, which demands that all agents send RUM call, these need to be sent even outside of the main window context where PerformanceTiming
    // or PerformanceNavigationTiming do not exists. Hence, they'll be filled in by 0s instead in, for example, worker threads that still init the PVE module.
    this.aggregator.store('measures', 'be', { value: this.timeToFirstByte })
    this.aggregator.store('measures', 'fe', { value: this.firstByteToWindowLoad })
    this.aggregator.store('measures', 'dc', { value: this.firstByteToDomContent })

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

    if (agentRuntime.session) queryParameters.fsh = Number(agentRuntime.session.isNew) // "first session harvest" aka RUM request or PageView event of a session

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

    queryParameters.fp = firstPaint.current.value
    queryParameters.fcp = firstContentfulPaint.current.value

    harvester.send({
      endpoint: 'rum',
      payload: { qs: queryParameters, body },
      opts: { needResponse: true, sendEmptyBody: true },
      cbFinished: ({ status, responseText }) => {
        if (status >= 400 || status === 0) {
          // Adding retry logic for the rum call will be a separate change
          this.ee.abort()
          return
        }

        try {
          activateFeatures(JSON.parse(responseText), this.agentIdentifier)
          this.drain()
        } catch (err) {
          this.ee.abort()
          warn('RUM call failed. Agent shutting down.', err)
        }
      }
    })
  }
}
