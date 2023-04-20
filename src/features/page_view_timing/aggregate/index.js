/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { onFCP, onFID, onLCP, onCLS, onINP } from 'web-vitals'
import { onFirstPaint } from '../first-paint'
import { onLongTask } from '../long-tasks'
import { iOS_below16 } from '../../../common/browser-version/ios-version'
import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { mapOwn } from '../../../common/util/map-own'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { cleanURL } from '../../../common/url/clean-url'
import { handle } from '../../../common/event-emitter/handle'
import { getInfo, getConfigurationValue, getRuntime } from '../../../common/config/config'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'
import { drain } from '../../../common/drain/drain'
import { FEATURE_NAMES } from '../../../loaders/features/features'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.timings = []
    this.timingsSent = []
    this.curSessEndRecorded = false
    this.cls = null // this should be null unless set to a numeric value by web-vitals so that we differentiate if CLS is supported

    /*! This is the section that used to be in the loader portion: !*/
    /* ------------------------------------------------------------ */
    const pageStartedHidden = getRuntime(agentIdentifier).initHidden // our attempt at recapturing initial vis state since this code runs post-load time
    this.alreadySent = new Set() // since we don't support timings on BFCache restores, this tracks and helps cap metrics that web-vitals report more than once

    /* PerformancePaintTiming API - BFC is not yet supported. */
    onFirstPaint(({ name, value }) => {
      if (pageStartedHidden) return
      this.addTiming(name.toLowerCase(), Math.floor(value))
    })

    /* First Contentful Paint - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
    if (iOS_below16) {
      try {
        if (!pageStartedHidden) { // see ios-version.js for detail on this following bug case; tldr: buffered flag doesn't work but getEntriesByType does
          const paintEntries = performance.getEntriesByType('paint')
          paintEntries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              this.addTiming('fcp', Math.floor(entry.startTime))
            }
          })
        }
      } catch (e) {}
    } else {
      onFCP(({ name, value }) => {
        if (pageStartedHidden || this.alreadySent.has(name)) return
        this.alreadySent.add(name)
        this.addTiming(name.toLowerCase(), value)
      })
    }

    /* First Input Delay (+"First Interaction") - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
    onFID(({ name, value, entries }) => {
      if (pageStartedHidden || this.alreadySent.has(name)) return
      this.alreadySent.add(name)

      // CWV will only report one (THE) first-input entry to us; fid isn't reported if there are no user interactions occurs before the *first* page hiding.
      const fiEntry = entries[0]
      const attributes = {
        type: fiEntry.name,
        fid: Math.round(value)
      }
      this.addConnectionAttributes(attributes)
      this.addTiming('fi', Math.round(fiEntry.startTime), attributes)
    })

    /* Largest Contentful Paint - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
    onLCP(({ name, value, entries }) => {
      if (pageStartedHidden || this.alreadySent.has(name)) return
      this.alreadySent.add(name)

      // CWV will only ever report one (THE) lcp entry to us; lcp is also only reported *once* on earlier(user interaction, page hidden).
      const lcpEntry = entries[entries.length - 1] // this looks weird if we only expect one, but this is how cwv-attribution gets it so to be sure...
      const attrs = {
        size: lcpEntry.size,
        eid: lcpEntry.id
      }
      this.addConnectionAttributes(attrs)
      if (lcpEntry.url) {
        attrs['elUrl'] = cleanURL(lcpEntry.url)
      }
      if (lcpEntry.element && lcpEntry.element.tagName) {
        attrs['elTag'] = lcpEntry.element.tagName
      }
      this.addTiming(name.toLowerCase(), value, attrs)
    })

    /* Cumulative Layout Shift - We don't have to limit this callback since cls is stored as a state and only sent as attribute on other timings. */
    onCLS(({ value }) => this.cls = value)

    /* Interaction-to-Next-Paint */
    onINP(({ name, value, id }) => this.addTiming(name.toLowerCase(), value, { metricId: id }))

    /* PerformanceLongTaskTiming API */
    if (getConfigurationValue(this.agentIdentifier, 'page_view_timing.long_task') === true) {
      onLongTask(({ name, value, info }) => this.addTiming(name.toLowerCase(), value, info)) // lt context is passed as 'info'=attrs in the timing node
    }
    /* ------------------------------------End of ex-loader section */

    /* It's important that CWV api, like "onLCP", is called before this scheduler is initialized. The reason is because they listen to the same
      on vis change or pagehide events, and we'd want ex. onLCP to record the timing (win the race) before we try to send "final harvest". */
    this.scheduler = new HarvestScheduler('events', {
      onFinished: (...args) => this.onHarvestFinished(...args),
      getPayload: (...args) => this.prepareHarvest(...args)
    }, this)

    registerHandler('timing', (name, value, attrs) => this.addTiming(name, value, attrs), this.featureName, this.ee) // notice CLS is added to all timings via 4th param
    registerHandler('docHidden', msTimestamp => this.endCurrentSession(msTimestamp), this.featureName, this.ee)
    registerHandler('winPagehide', msTimestamp => this.recordPageUnload(msTimestamp), this.featureName, this.ee)

    const initialHarvestSeconds = getConfigurationValue(this.agentIdentifier, 'page_view_timing.initialHarvestSeconds') || 10
    const harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'page_view_timing.harvestTimeSeconds') || 30
    // send initial data sooner, then start regular
    this.ee.on(`drain-${this.featureName}`, () => { this.scheduler.startTimer(harvestTimeSeconds, initialHarvestSeconds) })

    drain(this.agentIdentifier, this.featureName)
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

  /**
   * Add the time of _document visibilitychange to hidden_ to the next PVT harvest == NRDB pageHide attr.
   * @param {number} timestamp
   */
  endCurrentSession (timestamp) {
    if (!this.curSessEndRecorded) { // TO DO: stage 2 - we don't want to capture this timing twice on page navigating away, but it should run again if we return to page and away *again*
      this.addTiming('pageHide', timestamp, null)
      this.curSessEndRecorded = true
    }
  }

  /**
   * Add the time of _window pagehide event_ firing to the next PVT harvest == NRDB windowUnload attr.
   */
  recordPageUnload (timestamp) {
    this.addTiming('unload', timestamp, null)
    // Because window's pageHide commonly fires before vis change and the final harvest occurs on the earlier of the two, we also have to add that now or it won't make it into the last payload out.
    this.endCurrentSession(timestamp)
  }

  addTiming (name, value, attrs) {
    attrs = attrs || {}

    // If cls was set to another value by `onCLS`, then it's supported and is attached onto any timing but is omitted until such time.
    // *cli Apr'23 - Convert attach-to-all -> attach-if-not-null. See NEWRELIC-6143.
    if (this.cls !== null) {
      attrs['cls'] = this.cls
    }

    this.timings.push({
      name: name,
      value: value,
      attrs: attrs
    })

    handle('pvtAdded', [name, value, attrs], undefined, FEATURE_NAMES.sessionTrace, this.ee)
  }

  onHarvestFinished (result) {
    if (result.retry && this.timingsSent.length > 0) {
      for (var i = 0; i < this.timingsSent.length; i++) {
        this.timings.push(this.timingsSent[i])
      }
      this.timingsSent = []
    }
  }

  appendGlobalCustomAttributes (timing) {
    var timingAttributes = timing.attrs || {}
    var customAttributes = getInfo(this.agentIdentifier).jsAttributes || {}

    var reservedAttributes = ['size', 'eid', 'cls', 'type', 'fid', 'elTag', 'elUrl', 'net-type',
      'net-etype', 'net-rtt', 'net-dlink']
    mapOwn(customAttributes, function (key, val) {
      if (reservedAttributes.indexOf(key) < 0) {
        timingAttributes[key] = val
      }
    })
  }

  // serialize and return current timing data, clear and save current data for retry
  prepareHarvest (options) {
    if (this.timings.length === 0) return

    var payload = this.getPayload(this.timings)
    if (options.retry) {
      for (var i = 0; i < this.timings.length; i++) {
        this.timingsSent.push(this.timings[i])
      }
    }
    this.timings = []
    return { body: { e: payload } }
  }

  // serialize array of timing data
  getPayload (data) {
    var addString = getAddStringContext(this.agentIdentifier)

    var payload = 'bel.6;'

    for (var i = 0; i < data.length; i++) {
      var timing = data[i]

      payload += 'e,'
      payload += addString(timing.name) + ','
      payload += nullable(timing.value, numeric, false) + ','

      this.appendGlobalCustomAttributes(timing)

      var attrParts = addCustomAttributes(timing.attrs, addString)
      if (attrParts && attrParts.length > 0) {
        payload += numeric(attrParts.length) + ';' + attrParts.join(';')
      }

      if ((i + 1) < data.length) payload += ';'
    }

    return payload
  }
}
