/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { eventListenerOpts, windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { debounce } from '../../../common/util/invoke'
import { setupAddPageActionAPI } from '../../../loaders/api/addPageAction'
import { setupFinishedAPI } from '../../../loaders/api/finished'
import { setupRecordCustomEventAPI } from '../../../loaders/api/recordCustomEvent'
import { setupRegisterAPI } from '../../../loaders/api/register'
import { setupMeasureAPI } from '../../../loaders/api/measure'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, OBSERVED_EVENTS, OBSERVED_WINDOW_EVENTS } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { wrapHistory } from '../../../common/wrap/wrap-history'
import { wrapFetch } from '../../../common/wrap/wrap-fetch'
import { wrapXhr } from '../../../common/wrap/wrap-xhr'
import { parseUrl } from '../../../common/url/parse-url'
import { extractUrl } from '../../../common/url/extract-url'
import { wrapWebSocket } from '../../../common/wrap/wrap-websocket'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)
    const websocketsEnabled = agentRef.init.feature_flags.includes('websockets') || agentRef.init.web_sockets?.enabled
    const securityPolicyViolationEnabled = !agentRef.init.feature_flags.includes('no_spv')

    /** config values that gate whether the generic events aggregator should be imported at all */
    const genericEventSourceConfigs = [
      agentRef.init.page_action.enabled,
      agentRef.init.performance.capture_marks,
      agentRef.init.performance.capture_measures,
      agentRef.init.performance.resources.enabled,
      agentRef.init.user_actions.enabled,
      websocketsEnabled,
      securityPolicyViolationEnabled
    ]

    /** feature specific APIs */
    setupAddPageActionAPI(agentRef)
    setupRecordCustomEventAPI(agentRef)
    setupFinishedAPI(agentRef)
    setupRegisterAPI(agentRef)
    setupMeasureAPI(agentRef)

    this.removeOnAbort = new AbortController()
    this.abortHandler = () => {
      this.removeOnAbort.abort()
      this.abortHandler = undefined // weakly allow this abort op to run only once
    }

    let historyEE
    if (websocketsEnabled) { // this can apply outside browser scope such as in worker
      const websocketsEE = wrapWebSocket(this.ee, agentRef)
      websocketsEE.on('ws', (nrData, targets) => {
        handle('ws-complete', [nrData, targets], undefined, this.featureName, this.ee)
      })
    }
    if (securityPolicyViolationEnabled) {
      /** ReportingObserver's `csp-violation` type isn't reliably enabled everywhere out of the box:
       *  - Safari only delivers it when the page sets a report-to CSP directive -- https://bugs.webkit.org/show_bug.cgi?id=320750;
       *  - Firefox ships it behind the `dom.reporting.enabled` pref, which defaults to false;
       * So it's only used for violations that occur before the agent loaded, targeting Chromium browsers. `buffered: true` replays
       * that backlog in the observer's first callback invocation, after which it's disconnected and all future violations are
       * covered by securitypolicyviolation, which is reliable across all browsers. */
      if (typeof globalScope.ReportingObserver === 'function') {
        const cspObserver = new globalScope.ReportingObserver((reports) => {
          reports.forEach(report => {
            handle('spv', [normalizeCspViolation(report), now()], undefined, FEATURE_NAMES.genericEvents, this.ee)
          })
          cspObserver.disconnect()
        }, { types: ['csp-violation'], buffered: true })
        cspObserver.observe()
      }

      globalScope.addEventListener('securitypolicyviolation', (evt) => {
        handle('spv', [normalizeCspViolation(evt), evt.timeStamp], undefined, FEATURE_NAMES.genericEvents, this.ee)
      }, eventListenerOpts(false, this.removeOnAbort.signal))
    }
    if (isBrowserScope) {
      wrapFetch(this.ee, agentRef)
      wrapXhr(this.ee, agentRef)
      historyEE = wrapHistory(this.ee, agentRef)

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

        globalScope.addEventListener('error', () => {
          handle('uaErr', [], undefined, FEATURE_NAMES.genericEvents, this.ee)
        }, eventListenerOpts(false, this.removeOnAbort.signal))

        this.ee.on('open-xhr-start', (args, xhr) => {
          if (!isInternalTraffic(args[1])) {
            xhr.addEventListener('readystatechange', () => {
              if (xhr.readyState === 2) { // HEADERS_RECEIVED
                handle('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, this.ee)
              }
            }, eventListenerOpts(undefined, this.removeOnAbort.signal))
          }
        })
        this.ee.on('fetch-start', (fetchArguments) => {
          if (fetchArguments.length >= 1 && !isInternalTraffic(extractUrl(fetchArguments[0]))) {
            handle('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, this.ee)
          }
        })

        function isInternalTraffic (url) {
          const parsedUrl = parseUrl(url)
          return agentRef.beacons.includes(parsedUrl.hostname + ':' + parsedUrl.port)
        }

        historyEE.on('pushState-end', navigationChange)
        historyEE.on('replaceState-end', navigationChange)
        window.addEventListener('hashchange', navigationChange, eventListenerOpts(true, this.removeOnAbort.signal))
        window.addEventListener('popstate', navigationChange, eventListenerOpts(true, this.removeOnAbort.signal))

        function navigationChange () {
          historyEE.emit('navChange')
        }
      }

      if (agentRef.init.performance.resources.enabled && globalScope.PerformanceObserver?.supportedEntryTypes.includes('resource')) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            handle('browserPerformance.resource', [entry], undefined, this.featureName, this.ee)
          })
        })
        observer.observe({
          type: 'resource',
          buffered: true
        })
      }
    }
    /** If any of the sources are active, import the aggregator. otherwise deregister */
    if (genericEventSourceConfigs.some(x => x)) this.importAggregator(agentRef, () => import(/* webpackChunkName: "generic_events-aggregate" */ '../aggregate'))
    else this.deregisterDrain()
  }
}
/** `Report.body` (ReportingObserver) and `SecurityPolicyViolationEvent` (securitypolicyviolation) describe the same
 * violation with differently-named/shaped fields -- collapse both into one shape so downstream code doesn't care
 * which mechanism produced it. `source` is either of those: a Report (fields under `.body`, URLs as blockedURL/
 * documentURL) or the event (fields at the top level, URLs as blockedURI/documentURI). Also normalizes disposition's
 * "reporting" (Report body) to "report" (event) so the value is consistent regardless of source. */
function normalizeCspViolation (source) {
  const body = source.body ?? source
  return {
    blockedUrl: body.blockedURL ?? source.blockedURI,
    documentUrl: body.documentURL ?? source.documentURI,
    effectiveDirective: body.effectiveDirective,
    originalPolicy: body.originalPolicy,
    sourceFile: body.sourceFile,
    statusCode: body.statusCode,
    lineNumber: body.lineNumber,
    columnNumber: body.columnNumber,
    disposition: body.disposition === 'reporting' ? 'report' : body.disposition,
    sample: body.sample,
    referrer: body.referrer
  }
}

export const GenericEvents = Instrument
