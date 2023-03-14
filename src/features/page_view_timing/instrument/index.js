/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { subscribeToVisibilityChange, initializeHiddenTime } from '../../../common/window/page-visibility'
import { documentAddEventListener, windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { getConfigurationValue, getRuntime, originals } from '../../../common/config/config'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { isBrowserScope } from '../../../common/util/global-scope'
import { onINP } from 'web-vitals'
import { onLongTask } from './long-tasks'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope) return // CWV is irrelevant outside web context

    this.pageHiddenTime = initializeHiddenTime() // synonymous with initial visibilityState
    this.performanceObserver
    this.lcpPerformanceObserver
    this.clsPerformanceObserver
    this.fiRecorded = false

    if ('PerformanceObserver' in window && typeof window.PerformanceObserver === 'function') {
      // passing in an unknown entry type to observer could throw an exception
      this.performanceObserver = new PerformanceObserver((...args) => this.perfObserver(...args))
      try {
        this.performanceObserver.observe({ entryTypes: ['paint'] })
      } catch (e) {
        // do nothing
      }

      this.lcpPerformanceObserver = new PerformanceObserver((...args) => this.lcpObserver(...args))
      try {
        this.lcpPerformanceObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        // do nothing
      }

      this.clsPerformanceObserver = new PerformanceObserver((...args) => this.clsObserver(...args))
      try {
        this.clsPerformanceObserver.observe({ type: 'layout-shift', buffered: true })
      } catch (e) {
        // do nothing
      }
    }

    // first interaction and first input delay
    this.fiRecorded = false
    var allowedEventTypes = ['click', 'keydown', 'mousedown', 'pointerdown', 'touchstart']
    allowedEventTypes.forEach((e) => {
      documentAddEventListener(e, (...args) => this.captureInteraction(...args))
    })

    /** Interaction-to-Next-Paint */
    onINP(({ name, value, id }) => {
      handle('timing', [name.toLowerCase(), value, { metricId: id }], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    })

    if (getConfigurationValue(this.agentIdentifier, 'page_view_timing.long_task') === true) {
      onLongTask(({ name, value, info }) => {
        handle('timing', [name.toLowerCase(), value, info], undefined, FEATURE_NAMES.pageViewTiming, this.ee) // lt context is passed as attrs in the timing node
      })
    }

    // Document visibility state becomes hidden
    subscribeToVisibilityChange(() => {
      // time is only recorded to be used for short-circuit logic in the observer callbacks
      this.pageHiddenTime = now()
      handle('docHidden', [this.pageHiddenTime], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    }, true)

    // Window fires its pagehide event (typically on navigation; this occurrence is a *subset* of vis change)
    windowAddEventListener('pagehide', () => handle('winPagehide', [now()], undefined, FEATURE_NAMES.pageViewTiming, this.ee))

    this.importAggregator()
  }

  // paint metrics
  perfObserver (list, observer) {
    var entries = list.getEntries()
    entries.forEach((entry) => {
      if (entry.name === 'first-paint') {
        handle('timing', ['fp', Math.floor(entry.startTime)], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
      } else if (entry.name === 'first-contentful-paint') {
        handle('timing', ['fcp', Math.floor(entry.startTime)], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
      }
    })
  }

  // largest contentful paint
  lcpObserver (list, observer) {
    var entries = list.getEntries()
    if (entries.length > 0) {
      var entry = entries[entries.length - 1]

      // metrics become inflated if the page was ever hidden, so they aren't sent
      if (this.pageHiddenTime < entry.startTime) return

      var payload = [entry]

      var attributes = this.addConnectionAttributes({})
      if (attributes) payload.push(attributes)

      handle('lcp', payload, undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    }
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

  captureInteraction (evt) {
    // if (evt instanceof origEvent && !fiRecorded) {
    if (evt instanceof originals.EV && !this.fiRecorded) {
      var fi = Math.round(evt.timeStamp)
      var attributes = {
        type: evt.type
      }

      this.addConnectionAttributes(attributes)

      const offset = getRuntime(this.agentIdentifier).offset
      // The value of Event.timeStamp is epoch time in some old browser, and relative
      // timestamp in newer browsers. We assume that large numbers represent epoch time.
      if (fi <= now()) {
        attributes['fid'] = now() - fi
      } else if (fi > offset && fi <= Date.now()) {
        fi = fi - offset
        attributes['fid'] = now() - fi
      } else {
        fi = now()
      }

      this.fiRecorded = true
      handle('timing', ['fi', fi, attributes], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
    }
  }
}
