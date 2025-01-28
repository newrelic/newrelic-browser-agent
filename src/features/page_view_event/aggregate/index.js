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
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { EventStoreManager } from '../../utils/event-store-manager'
import { EventAggregator } from '../../../common/aggregate/event-aggregator'

export class Aggregate extends AggregateBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, CONSTANTS.FEATURE_NAME)

    this.timeToFirstByte = 0
    this.firstByteToWindowLoad = 0 // our "frontend" duration
    this.firstByteToDomContent = 0 // our "dom processing" duration

    registerHandler('api-pve', (cb, customAttibutes, target) => {
      this.sendRum(cb, customAttibutes, target)
    }, this.featureName, this.ee)

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

  /**
   *
   * @param {Function} cb A function to run once the RUM call has finished - Defaults to activateFeatures
   * @param {*} customAttributes custom attributes to attach to the RUM call - Defaults to info.js
   * @param {*} target The target to harvest to - Since we will not know the entityGuid before harvesting, this must be an object directly supplied from the info object or API, not an entityGuid string for lookup with the entityManager - Defaults to { licenseKey: this.agentRef.info.licenseKey, applicationID: this.agentRef.info.applicationID }
   */
  sendRum (cb = activateFeatures, customAttributes = this.agentRef.info.jsAttributes, target = { licenseKey: this.agentRef.info.licenseKey, applicationID: this.agentRef.info.applicationID }) {
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

    const timeKeeper = this.agentRef.runtime.timeKeeper
    if (timeKeeper?.ready) {
      queryParameters.timestamp = Math.floor(timeKeeper.correctRelativeTimestamp(now()))
    }

    this.rumStartTime = now()

    this.agentRef.runtime.harvester.triggerHarvestFor(this, {
      directSend: {
        targetApp: target,
        payload: { qs: queryParameters, body }
      },
      needResponse: true,
      sendEmptyBody: true,
      cbFinished: cb
    })
  }

  postHarvestCleanup ({ status, responseText, xhr, targetApp, cbFinished = activateFeatures }) {
    const rumEndTime = now()

    if (status >= 400 || status === 0) {
      warn(18, status)
      // Adding retry logic for the rum call will be a separate change; this.blocked will need to be changed since that prevents another triggerHarvestFor()
      this.ee.abort()
      return
    }

    const rumResponse = JSON.parse(responseText)
    try {
      // will do nothing if already done
      this.agentRef.runtime.timeKeeper.processRumRequest(xhr, this.rumStartTime, rumEndTime, rumResponse.app.nrServerTime)
      if (!this.agentRef.runtime.timeKeeper.ready) throw new Error('TimeKeeper not ready')
    } catch (error) {
      this.ee.abort()
      warn(17, error)
      return
    }

    this.processEntityGuidFromRumResponse(rumResponse, targetApp)

    // cbFinished is the activateFeatures function by default, but can be another cb function for the MFE api too
    cbFinished(rumResponse, this.agentIdentifier)
    this.drain()
    this.agentRef.runtime.harvester.startTimer()
  }

  /**
   * Process any tasks that require use of the entity guid directly, like creating the shared agg or the runtime metadata
   * @param {*} rumResponse the rum response object returned from the server
   * @param {*} targetApp the target app object that was used to point the rum call to the correct app
   * @returns {void}
   */
  processEntityGuidFromRumResponse (rumResponse, targetApp) {
    const respEntityGuid = rumResponse.app.agents[0].entityGuid
    if (!respEntityGuid) return warn(52)
    // set the entity manager with the entity guid and the target app object
    this.agentRef.runtime.entityManager.set(respEntityGuid, { entityGuid: respEntityGuid, ...targetApp })
    // set the agent runtime objects that require the rum response or entity guid
    if (!Object.keys(this.agentRef.runtime.appMetadata).length) this.agentRef.runtime.appMetadata = rumResponse.app
    if (!this.agentRef.sharedAggregator) this.agentRef.sharedAggregator = new EventStoreManager(this.agentRef.runtime.entityManager, EventAggregator, respEntityGuid)
    // alert any features that need the entity guid, such as those waiting to set up event buffers
    this.ee.emit('entity-guid', [respEntityGuid])
  }
}
