import { globalScope, isBrowserScope, originTime } from '../../../common/constants/runtime'
import { addPT, addPN } from '../../../common/timing/nav-timing'
import { stringify } from '../../../common/util/stringify'
import { isValid } from '../../../common/config/info'
import * as CONSTANTS from '../constants'
import { getActivatedFeaturesFlags } from './initialized-features'
import { activateFeatures } from '../../../common/util/feature-flags'
import { warn } from '../../../common/util/console'
import { AggregateBase } from '../../utils/aggregate-base'
import { firstContentfulPaint } from '../../../common/vitals/first-contentful-paint'
import { firstPaint } from '../../../common/vitals/first-paint'
import { timeToFirstByte } from '../../../common/vitals/time-to-first-byte'
import { now } from '../../../common/timing/now'
import { TimeKeeper } from '../../../common/timing/time-keeper'
import { applyFnToProps } from '../../../common/util/traverse'

export class Aggregate extends AggregateBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, CONSTANTS.FEATURE_NAME)

    this.timeToFirstByte = 0
    this.firstByteToWindowLoad = 0 // our "frontend" duration
    this.firstByteToDomContent = 0 // our "dom processing" duration

    if (!isValid(agentRef.agentIdentifier)) {
      this.ee.abort()
      return warn(43)
    }
    agentRef.runtime.timeKeeper = new TimeKeeper(agentRef.agentIdentifier)

    if (isBrowserScope) {
      timeToFirstByte.subscribe(({ value, attrs }) => {
        const navEntry = attrs.navigationEntry
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
    const info = this.agentRef.info
    const measures = {}

    if (info.queueTime) measures.qt = info.queueTime
    if (info.applicationTime) measures.ap = info.applicationTime

    // These 3 values should've been recorded after load and before this func runs. They are part of the minimum required for PageView events to be created.
    // Following PR #428, which demands that all agents send RUM call, these need to be sent even outside of the main window context where PerformanceTiming
    // or PerformanceNavigationTiming do not exists. Hence, they'll be filled in by 0s instead in, for example, worker threads that still init the PVE module.
    measures.be = this.timeToFirstByte
    measures.fe = this.firstByteToWindowLoad
    measures.dc = this.firstByteToDomContent

    const queryParameters = {
      tt: info.ttGuid,
      us: info.user,
      ac: info.account,
      pr: info.product,
      af: getActivatedFeaturesFlags(this.agentIdentifier).join(','),
      ...measures,
      xx: info.extra,
      ua: info.userAttributes,
      at: info.atts
    }

    if (this.agentRef.runtime.session) queryParameters.fsh = Number(this.agentRef.runtime.session.isNew) // "first session harvest" aka RUM request or PageView event of a session

    let body
    if (typeof info.jsAttributes === 'object' && Object.keys(info.jsAttributes).length > 0) {
      body = applyFnToProps({ ja: info.jsAttributes }, this.obfuscator.obfuscateString.bind(this.obfuscator), 'string')
    }

    if (globalScope.performance) {
      if (typeof PerformanceNavigationTiming !== 'undefined') { // Navigation Timing level 2 API that replaced PerformanceTiming & PerformanceNavigation
        const navTimingEntry = globalScope?.performance?.getEntriesByType('navigation')?.[0]
        const perf = ({
          timing: addPT(originTime, navTimingEntry, {}),
          navigation: addPN(navTimingEntry, {})
        })
        queryParameters.perf = stringify(perf)
      } else if (typeof PerformanceTiming !== 'undefined') { // Safari pre-15 did not support level 2 timing
        const perf = ({
          timing: addPT(originTime, globalScope.performance.timing, {}, true),
          navigation: addPN(globalScope.performance.navigation, {})
        })
        queryParameters.perf = stringify(perf)
      }
    }

    queryParameters.fp = firstPaint.current.value
    queryParameters.fcp = firstContentfulPaint.current.value

    const timeKeeper = this.agentRef.runtime.timeKeeper
    if (timeKeeper?.ready) {
      queryParameters.timestamp = Math.floor(timeKeeper.correctRelativeTimestamp(now()))
    }

    this.rumStartTime = now()
    this.agentRef.runtime.harvester.triggerHarvestFor(this, {
      directSend: {
        targetApp: this.agentRef.mainAppKey,
        payload: { qs: queryParameters, body }
      },
      needResponse: true,
      sendEmptyBody: true
    })
  }

  postHarvestCleanup ({ status, responseText, xhr }) {
    const rumEndTime = now()
    this.blocked = true // this prevents harvester from polling this feature's event buffer (DNE) on interval; in other words, harvests will skip PVE

    if (status >= 400 || status === 0) {
      warn(18, status)
      // Adding retry logic for the rum call will be a separate change; this.blocked will need to be changed since that prevents another triggerHarvestFor()
      this.ee.abort()
      return
    }

    const { app, ...flags } = JSON.parse(responseText)
    try {
      this.agentRef.runtime.timeKeeper.processRumRequest(xhr, this.rumStartTime, rumEndTime, app.nrServerTime)
      if (!this.agentRef.runtime.timeKeeper.ready) throw new Error('TimeKeeper not ready')
    } catch (error) {
      this.ee.abort()
      warn(17, error)
      return
    }
    this.agentRef.runtime.appMetadata = app
    activateFeatures(flags, this.agentIdentifier)
    this.drain()
    this.agentRef.runtime.harvester.startTimer()
  }
}
