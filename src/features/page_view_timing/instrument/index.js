/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { onFCP, onFID, onLCP, onINP } from 'web-vitals'
import { onFirstPaint } from './first-paint'
import { onLongTask } from './long-tasks'
import { subscribeToVisibilityChange } from '../../../common/window/page-visibility'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { getConfigurationValue } from '../../../common/config/config'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { isBrowserScope } from '../../../common/util/global-scope'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope) return // CWV is irrelevant outside web context

    this.clsPerformanceObserver

    if ('PerformanceObserver' in window && typeof window.PerformanceObserver === 'function') {
      this.clsPerformanceObserver = new PerformanceObserver((...args) => this.clsObserver(...args))
      try {
        this.clsPerformanceObserver.observe({ type: 'layout-shift', buffered: true })
      } catch (e) {
        // do nothing
      }
    }

    /* PerformancePaintTiming API
        This listener is deferrable BUT because it does not consider document vis state yet, unlike FID and LCP below. */
    onFirstPaint(({ name, value }) => {
      handle('timing', [name.toLowerCase(), Math.floor(value)], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    })

    /* First Contentful Paint
        This listener cannot be deferred yet maintain full functionality under v3. Reason: it relies on detecting document vis state asap from time origin. */
    onFCP(({ name, value }) => {
      handle('timing', [name.toLowerCase(), value], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    })

    /* First Input Delay (under "First Interaction")
        This listener cannot be deferred yet maintain full functionality under v3. Reason: it relies on detecting document vis state asap from time origin. */
    onFID(({ value, entries }) => {
      // CWV will only report one (THE) first-input entry to us; fid isn't reported if there are no user interactions occurs before the *first* page hiding.
      const fiEntry = entries[0]
      const attributes = {
        type: fiEntry.name,
        fid: Math.round(value)
      }
      this.addConnectionAttributes(attributes)
      handle('timing', ['fi', Math.round(fiEntry.startTime), attributes], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    })

    /* Largest Contentful Paint
        This listener cannot be deferred yet maintain full functionality under v3. Reason: it relies on detecting document vis state asap from time origin. */
    onLCP(({ value, entries }) => {
      // CWV will only ever report one (THE) lcp entry to us; lcp is also only reported *once* on earlier(user interaction, page hidden).
      const lcpEntry = entries[entries.length - 1] // this looks weird if we only expect one, but this is how cwv-attribution gets it so to be sure...
      const attributes = this.addConnectionAttributes({})
      handle('lcp', [value, lcpEntry, attributes], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    })

    /* Interaction-to-Next-Paint
        This listener IS deferrable, though further validation required. */
    onINP(({ name, value, id }) => {
      handle('timing', [name.toLowerCase(), value, { metricId: id }], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    })

    /* PerformanceLongTaskTiming API
        This listener IS deferrable. */
    if (getConfigurationValue(this.agentIdentifier, 'page_view_timing.long_task') === true) {
      onLongTask(({ name, value, info }) => {
        handle('timing', [name.toLowerCase(), value, info], undefined, FEATURE_NAMES.pageViewTiming, this.ee) // lt context is passed as attrs in the timing node
      })
    }

    // Document visibility state becomes hidden; cannot assume safely deferrable.
    subscribeToVisibilityChange(() => {
      handle('docHidden', [now()], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    }, true)

    // Window fires its pagehide event (typically on navigation--this occurrence is a *subset* of vis change); cannot assume safely deferrable.
    windowAddEventListener('pagehide', () => handle('winPagehide', [now()], undefined, FEATURE_NAMES.pageViewTiming, this.ee))

    this.importAggregator()
  }

  clsObserver (list) {
    list.getEntries().forEach((entry) => {
      if (!entry.hadRecentInput) {
        handle('cls', [entry], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
      }
    })
  }

  // takes an attributes object and appends connection attributes if available
  addConnectionAttributes (attributes) {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection // to date, both window & worker shares the same support for connection
    if (!connection) return

    if (connection.type) attributes['net-type'] = connection.type
    if (connection.effectiveType) attributes['net-etype'] = connection.effectiveType
    if (connection.rtt) attributes['net-rtt'] = connection.rtt
    if (connection.downlink) attributes['net-dlink'] = connection.downlink

    return attributes
  }
}
