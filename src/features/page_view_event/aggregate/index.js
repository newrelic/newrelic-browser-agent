/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
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
import { send } from '../../../common/harvest/harvester'
import { FEATURE_NAMES, FEATURE_TO_ENDPOINT } from '../../../loaders/features/features'
import { getSubmitMethod } from '../../../common/util/submit-data'

export class Aggregate extends AggregateBase {
  static featureName = CONSTANTS.FEATURE_NAME

  constructor (agentRef) {
    super(agentRef, CONSTANTS.FEATURE_NAME)

    this.sentRum = false // flag to facilitate calling sendRum() once externally (by the consent API in agent-session.js)

    this.timeToFirstByte = 0
    this.firstByteToWindowLoad = 0 // our "frontend" duration
    this.firstByteToDomContent = 0 // our "dom processing" duration
    this.retries = 0

    if (!isValid(agentRef.info)) {
      this.ee.abort()
      return warn(43)
    }
    agentRef.runtime.timeKeeper = new TimeKeeper(agentRef.runtime.session)

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

  /**
   *
   * @param {Function} cb A function to run once the RUM call has finished - Defaults to activateFeatures
   * @param {*} customAttributes custom attributes to attach to the RUM call - Defaults to info.js
   */
  sendRum (customAttributes = this.agentRef.info.jsAttributes) {
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
    if (typeof customAttributes === 'object' && Object.keys(customAttributes).length > 0) {
      body = applyFnToProps({ ja: customAttributes }, this.obfuscator.obfuscateString.bind(this.obfuscator), 'string')
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

    this.queryStringsBuilder = () => { // this will be called by AggregateBase.makeHarvestPayload every time harvest is triggered to be qs
      this.rumStartTime = now() // this should be reset at the beginning of each RUM call for proper timeKeeper calculation in coordination with postHarvestCleanup
      const timeKeeper = this.agentRef.runtime.timeKeeper
      if (timeKeeper?.ready) {
        queryParameters.timestamp = Math.floor(timeKeeper.correctRelativeTimestamp(this.rumStartTime))
      }
      return queryParameters
    }
    this.events.add(body)

    if (this.agentRef.runtime.harvester.triggerHarvestFor(this, {
      sendEmptyBody: true
    }).ranSend) this.sentRum = true
  }

  serializer (eventBuffer) { // this is necessary because PVE sends a single item rather than an array; in the case of undefined, this prevents sending [null] as body
    return eventBuffer[0]
  }

  postHarvestCleanup ({ sent, status, responseText, xhr, retry }) {
    const rumEndTime = now()
    let app, flags
    try {
      ({ app, ...flags } = JSON.parse(responseText))
    } catch (error) {
      // wont set entity stuff here, if main agent will later abort, if registered agent, nothing will happen
      warn(53, error)
    }

    super.postHarvestCleanup({ sent, retry }) // this will set isRetrying & re-buffer the body if request is to be retried
    if (this.isRetrying && this.retries++ < 1) { // Only retry once
      setTimeout(() => this.agentRef.runtime.harvester.triggerHarvestFor(this, {
        sendEmptyBody: true
      }), 5000) // Retry sending the RUM event after 5 seconds
      return
    }
    if (status >= 400 || status === 0) {
      warn(18, status)
      this.blocked = true

      // Get estimated payload size of our backlog
      const textEncoder = new TextEncoder()
      const payloadSize = Object.values(newrelic.ee.backlog).reduce((acc, value) => {
        if (!value) return acc

        const encoded = textEncoder.encode(value)
        return acc + encoded.byteLength
      }, 0)
      const BCSError = 'BCS/Error/'
      // Send SMs about failed RUM request
      const body = {
        sm: [{
          params: {
            name: BCSError + status
          },
          stats: {
            c: 1
          }
        },
        {
          params: {
            name: BCSError + 'Dropped/Bytes'
          },
          stats: {
            c: 1,
            t: payloadSize
          }
        },
        {
          params: {
            name: BCSError + 'Duration/Ms'
          },
          stats: {
            c: 1,
            t: rumEndTime - this.rumStartTime
          }
        }]
      }

      send(this.agentRef, {
        endpoint: FEATURE_TO_ENDPOINT[FEATURE_NAMES.metrics],
        payload: { body },
        submitMethod: getSubmitMethod(),
        featureName: FEATURE_NAMES.metrics
      })

      // Adding retry logic for the rum call will be a separate change; this.blocked will need to be changed since that prevents another triggerHarvestFor()
      this.ee.abort()
      return
    }

    try {
      const wasReady = this.agentRef.runtime.timeKeeper.ready

      // will do nothing if already done
      this.agentRef.runtime.timeKeeper.processRumRequest(xhr, this.rumStartTime, rumEndTime, app.nrServerTime)
      if (!this.agentRef.runtime.timeKeeper.ready) throw new Error('TimeKeeper not ready')

      // If timeKeeper's origin time is ahead of nrServerTime, then the timestamp is invalid. Report a supportability metric.
      const timeDiff = this.agentRef.runtime.timeKeeper.correctedOriginTime - app.nrServerTime
      if (wasReady && timeDiff > 0) {
        this.reportSupportabilityMetric('Generic/TimeKeeper/InvalidTimestamp/Seen', timeDiff)
      }
    } catch (error) {
      this.ee.abort()
      this.blocked = true
      warn(17, error)
      return
    }

    // set the agent runtime objects that require the rum response or entity guid
    if (!Object.keys(this.agentRef.runtime.appMetadata).length) this.agentRef.runtime.appMetadata = app

    this.drain()
    this.agentRef.runtime.harvester.startTimer()
    activateFeatures(flags, this.agentRef)
  }
}
