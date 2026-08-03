/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope, isBrowserScope, originTime, getNavigationEntry } from '../../../common/constants/runtime'
import { addPT, addPN } from '../../../common/timing/nav-timing'
import { stringify } from '../../../common/util/stringify'
import * as CONSTANTS from '../constants'
import { getActivatedFeaturesFlags } from '../aggregate/initialized-features'
import { AggregateBase } from '../../utils/aggregate-base'
import { firstContentfulPaint } from '../../../common/vitals/first-contentful-paint'
import { firstPaint } from '../../../common/vitals/first-paint'
import { timeToFirstByte } from '../../../common/vitals/time-to-first-byte'
import { Obfuscator } from '../../../common/util/obfuscate'
import { webdriverDetected } from '../../../common/util/webdriver-detection'
import { EVENT_TYPES } from '../../../common/constants/events'

export class Aggregate extends AggregateBase {
  static featureName = CONSTANTS.FEATURE_NAME

  #timeToFirstByte = 0
  #firstByteToWindowLoad = 0 // our "frontend" duration
  #firstByteToDomContent = 0 // our "dom processing" duration
  #obfuscator

  constructor (agentRef) {
    super(agentRef, CONSTANTS.FEATURE_NAME)
    this.#obfuscator = new Obfuscator(agentRef, EVENT_TYPES.PVE)

    if (isBrowserScope) {
      timeToFirstByte.subscribe(({ value, attrs }) => {
        const navEntry = attrs.navigationEntry
        this.#timeToFirstByte = Math.max(value, this.#timeToFirstByte)
        this.#firstByteToWindowLoad = Math.max(Math.round(navEntry.loadEventEnd - this.#timeToFirstByte), this.#firstByteToWindowLoad) // our "frontend" duration
        this.#firstByteToDomContent = Math.max(Math.round(navEntry.domContentLoadedEventEnd - this.#timeToFirstByte), this.#firstByteToDomContent) // our "dom processing" duration
      })
    }

    this.waitForFlags(([])).then(() => {
      const body = this.#obfuscator.traverseAndObfuscateEvents({ ja: { ...agentRef.info.jsAttributes, webdriverDetected } })
      this.events.add(body)
      this.drain()
    })
  }

  queryStringsBuilder () {
    const info = this.agentRef.info
    const measures = {}

    if (info.queueTime) measures.qt = info.queueTime
    if (info.applicationTime) measures.ap = info.applicationTime

    // These 3 values should've been recorded after load and before this func runs. They are part of the minimum required for PageView events to be created.
    // Following PR #428, which demands that the BA must drive entity indexing, these need to be sent even outside of the main window context where PerformanceTiming
    // or PerformanceNavigationTiming do not exists. Hence, they'll be filled in by 0s instead in, for example, worker threads that still init the PVE module.
    measures.be = this.#timeToFirstByte
    measures.fe = this.#firstByteToWindowLoad
    measures.dc = this.#firstByteToDomContent

    const queryParameters = {
      at: info.atts,
      af: getActivatedFeaturesFlags(this.agentRef).join(','),
      igp: this.agentRef.runtime.appMetadata.igp,
      ...measures,
      fp: firstPaint.current.value,
      fcp: firstContentfulPaint.current.value
    }
    if (globalScope.performance) {
      const navTimingEntry = getNavigationEntry()
      if (navTimingEntry) { // Navigation Timing level 2 API that replaced PerformanceTiming & PerformanceNavigation
        const perf = ({
          timing: addPT(originTime, navTimingEntry, {}),
          navigation: addPN(navTimingEntry, {})
        })
        queryParameters.perf = stringify(perf)
      } else if (typeof PerformanceTiming !== 'undefined') { // Modern Safari iFrames and Safari pre-15 do not support level 2 timing.
        const perf = ({
          timing: addPT(originTime, globalScope.performance.timing, {}, true),
          navigation: addPN(globalScope.performance.navigation, {})
        })
        queryParameters.perf = stringify(perf)
      }
    }
    const { correctedOriginTime } = this.agentRef.runtime.timeKeeper
    if (correctedOriginTime) queryParameters.timestamp = correctedOriginTime // a "PageView" is set to represent the page's (server adjusted) origin time rather than when event is recorded/harvested

    return queryParameters
  }

  get harvestEndpointVersion () {
    return 2
  }

  serializer (eventBuffer) { // this is necessary because PVE sends a single item rather than an array; in the case of undefined, this prevents sending [null] as body
    return eventBuffer[0]
  }
}
