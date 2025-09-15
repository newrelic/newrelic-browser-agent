/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { eventListenerOpts, windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { debounce } from '../../../common/util/invoke'
import { setupAddPageActionAPI } from '../../../loaders/api/addPageAction'
import { setupFinishedAPI } from '../../../loaders/api/finished'
import { setupRecordCustomEventAPI } from '../../../loaders/api/recordCustomEvent'
import { setupRegisterAPI } from '../../../loaders/api/register'
import { setupMeasureAPI } from '../../../loaders/api/measure'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, OBSERVED_EVENTS, OBSERVED_WINDOW_EVENTS } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { wrapFetch } from '../../../common/wrap/wrap-fetch'
import { wrapXhr } from '../../../common/wrap/wrap-xhr'
import { parseUrl } from '../../../common/url/parse-url'
import { extractUrl } from '../../../common/url/extract-url'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)
    /** config values that gate whether the generic events aggregator should be imported at all */
    const genericEventSourceConfigs = [
      agentRef.init.page_action.enabled,
      agentRef.init.performance.capture_marks,
      agentRef.init.performance.capture_measures,
      agentRef.init.user_actions.enabled,
      agentRef.init.performance.resources.enabled
    ]

    /** feature specific APIs */
    setupAddPageActionAPI(agentRef)
    setupRecordCustomEventAPI(agentRef)
    setupFinishedAPI(agentRef)
    setupRegisterAPI(agentRef)
    setupMeasureAPI(agentRef)

    if (isBrowserScope) {
      if (agentRef.init.user_actions.enabled) {
        OBSERVED_EVENTS.forEach(eventType =>
          windowAddEventListener(eventType, (evt) => handle('ua', [evt], undefined, this.featureName, this.ee), true)
        )
        OBSERVED_WINDOW_EVENTS.forEach(eventType => {
          const debounceHandler = debounce((evt) => { handle('ua', [evt], undefined, this.featureName, this.ee) }, 500, { leading: true })
          windowAddEventListener(eventType, debounceHandler)
        }
        // Capture is not used here so that we don't get element focus/blur events, only the window's as they do not bubble. They are also not cancellable, so no worries about being front of line.
        )
      }
      if (agentRef.init.performance.resources.enabled && globalScope.PerformanceObserver?.supportedEntryTypes.includes('resource')) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            handle('browserPerformance.resource', [entry], undefined, this.featureName, this.ee)
          })
        })
        observer.observe({ type: 'resource', buffered: true })
      }
    }

    try {
      this.removeOnAbort = new AbortController()
    } catch (e) {}

    this.abortHandler = () => {
      this.removeOnAbort?.abort()
      this.abortHandler = undefined // weakly allow this abort op to run only once
    }

    globalScope.addEventListener('error', () => {
      handle('uaErr', [], undefined, FEATURE_NAMES.genericEvents, this.ee)
    }, eventListenerOpts(false, this.removeOnAbort?.signal))

    wrapFetch(this.ee)
    wrapXhr(this.ee)
    this.ee.on('open-xhr-start', (args) => {
      this.parsedUrl = parseUrl(args[1])
    })
    this.ee.on('send-xhr-start', () => {
      emitIfNonAgentTraffic.call(this, this.parsedUrl)
    })
    this.ee.on('fetch-start', (fetchArguments) => {
      if (fetchArguments.length >= 1) { emitIfNonAgentTraffic.call(this, parseUrl(extractUrl(fetchArguments[0]))) }
    })

    function emitIfNonAgentTraffic (parsedUrl) {
      try {
        let host
        if (parsedUrl) host = parsedUrl.hostname + ':' + parsedUrl.port
        if (host && !agentRef.beacons.includes(host)) {
          handle('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, this.ee)
        }
      } catch {}
    }

    /** If any of the sources are active, import the aggregator. otherwise deregister */
    if (genericEventSourceConfigs.some(x => x)) this.importAggregator(agentRef, () => import(/* webpackChunkName: "generic_events-aggregate" */ '../aggregate'))
    else this.deregisterDrain()
  }
}

export const GenericEvents = Instrument
