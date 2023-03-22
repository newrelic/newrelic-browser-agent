/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { mapOwn } from '../../../common/util/map-own'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { cleanURL } from '../../../common/url/clean-url'
import { handle } from '../../../common/event-emitter/handle'
import { getInfo, getConfigurationValue } from '../../../common/config/config'
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

    try { // we (only) need to track cls state because it's attached to other timing events rather than reported on change...
      this.clsSupported = PerformanceObserver.supportedEntryTypes.includes('layout-shift')
      this.cls = 0
    } catch (e) {}

    var initialHarvestSeconds = getConfigurationValue(this.agentIdentifier, 'page_view_timing.initialHarvestSeconds') || 10
    var harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'page_view_timing.harvestTimeSeconds') || 30

    /* It's important that CWV api, like "onLCP", is called before this scheduler is initialized. The reason is because they share the same
      "final harvest" on vis change or unload logic, and we'd want ex. onLCP to record the timing before we try to send it (win the race). */
    this.scheduler = new HarvestScheduler('events', {
      onFinished: (...args) => this.onHarvestFinished(...args),
      getPayload: (...args) => this.prepareHarvest(...args)
    }, this)

    registerHandler('lcp', (value, lcpEntry, networkInformation) => this.recordLcp(value, lcpEntry, networkInformation), this.featureName, this.ee)
    registerHandler('cls', (value) => this.cls = value, this.featureName, this.ee) // on cls change, just update the internal state value

    registerHandler('timing', (name, value, attrs) => this.addTiming(name, value, attrs), this.featureName, this.ee) // notice CLS is added to all timings via 4th param
    registerHandler('docHidden', msTimestamp => this.endCurrentSession(msTimestamp), this.featureName, this.ee)
    registerHandler('winPagehide', msTimestamp => this.recordPageUnload(msTimestamp), this.featureName, this.ee)

    // send initial data sooner, then start regular
    this.ee.on(`drain-${this.featureName}`, () => { this.scheduler.startTimer(harvestTimeSeconds, initialHarvestSeconds) })

    drain(this.agentIdentifier, this.featureName)
  }

  recordLcp (lcpValue, lcpEntry, networkInfo) {
    var attrs = {
      size: lcpEntry.size,
      eid: lcpEntry.id
    }

    if (networkInfo) {
      if (networkInfo['net-type']) attrs['net-type'] = networkInfo['net-type']
      if (networkInfo['net-etype']) attrs['net-etype'] = networkInfo['net-etype']
      if (networkInfo['net-rtt']) attrs['net-rtt'] = networkInfo['net-rtt']
      if (networkInfo['net-dlink']) attrs['net-dlink'] = networkInfo['net-dlink']
    }

    if (lcpEntry.url) {
      attrs['elUrl'] = cleanURL(lcpEntry.url)
    }

    if (lcpEntry.element && lcpEntry.element.tagName) {
      attrs['elTag'] = lcpEntry.element.tagName
    }

    this.addTiming('lcp', lcpValue, attrs)
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

    // If CLS is supported, a cls value should exist and be reported, even at 0.
    // *cli Mar'23 - At this time, it remains attached to all timings. See NEWRELIC-6143.
    if (this.clsSupported) {
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
