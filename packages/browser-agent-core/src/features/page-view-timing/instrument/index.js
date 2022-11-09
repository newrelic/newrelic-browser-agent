/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { subscribeToVisibilityChange, initializeHiddenTime } from '../../../common/window/page-visibility'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { getOffset, now } from '../../../common/timing/now'
import { getConfigurationValue, originals } from '../../../common/config/config'
import { FeatureBase } from '../../../common/util/feature-base'
import { isBrowserWindow } from '../../../common/window/win'

export class Instrument extends FeatureBase {
  constructor(agentIdentifier) {
    super(agentIdentifier)
    if (!this.isEnabled() || !isBrowserWindow) return;  // CWV is irrelevant outside web context

    this.pageHiddenTime = initializeHiddenTime()  // synonymous with initial visibilityState
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
      document.addEventListener(e, (...args) => this.captureInteraction(...args), eventListenerOpts(false))
    })

    // page visibility events
    subscribeToVisibilityChange(() => this.onDocHide(), true);
  }

  isEnabled() {
    return getConfigurationValue(this.agentIdentifier, 'page_view_timing.enabled') !== false
  }

  // paint metrics
  perfObserver(list, observer) {
    var entries = list.getEntries()
    entries.forEach((entry) => {
      if (entry.name === 'first-paint') {
        handle('timing', ['fp', Math.floor(entry.startTime)], undefined, undefined, this.ee)
      } else if (entry.name === 'first-contentful-paint') {
        handle('timing', ['fcp', Math.floor(entry.startTime)], undefined, undefined, this.ee)
      }
    })
  }

  // largest contentful paint
  lcpObserver(list, observer) {
    var entries = list.getEntries()
    if (entries.length > 0) {
      var entry = entries[entries.length - 1]

      // metrics become inflated if the page was ever hidden, so they aren't sent
      if (this.pageHiddenTime < entry.startTime) return;

      var payload = [entry]

      var attributes = this.addConnectionAttributes({})
      if (attributes) payload.push(attributes)

      handle('lcp', payload, undefined, undefined, this.ee)
    }
  }

  clsObserver(list) {
    list.getEntries().forEach((entry) => {
      if (!entry.hadRecentInput) {
        handle('cls', [entry], undefined, undefined, this.ee)
      }
    })
  }

  // takes an attributes object and appends connection attributes if available
  addConnectionAttributes(attributes) {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection; // to date, both window & worker shares the same support for connection
    if (!connection) return

    if (connection.type) attributes['net-type'] = connection.type
    if (connection.effectiveType) attributes['net-etype'] = connection.effectiveType
    if (connection.rtt) attributes['net-rtt'] = connection.rtt
    if (connection.downlink) attributes['net-dlink'] = connection.downlink

    return attributes
  }

  captureInteraction(evt) {
    // if (evt instanceof origEvent && !fiRecorded) {
    if (evt instanceof originals.EV && !this.fiRecorded) {
      var fi = Math.round(evt.timeStamp)
      var attributes = {
        type: evt.type
      }

      this.addConnectionAttributes(attributes)

      // The value of Event.timeStamp is epoch time in some old browser, and relative
      // timestamp in newer browsers. We assume that large numbers represent epoch time.
      if (fi <= now()) {
        attributes['fid'] = now() - fi
      } else if (fi > getOffset() && fi <= Date.now()) {
        fi = fi - getOffset()
        attributes['fid'] = now() - fi
      } else {
        fi = now()
      }

      this.fiRecorded = true
      handle('timing', ['fi', fi, attributes], undefined, undefined, this.ee)
    }
  }

  onDocHide() {
    // time is only recorded to be used for short-circuit logic in the observer callbacks
    this.pageHiddenTime = now()
    handle('pageHide', [this.pageHiddenTime], undefined, undefined, this.ee)
  }
}
