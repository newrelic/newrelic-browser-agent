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
    this.lcpRecorded = false
    this.lcp = null
    this.clsSupported = false
    this.cls = 0
    this.clsSession = { value: 0, firstEntryTime: 0, lastEntryTime: 0 }
    this.curSessEndRecorded = false

    try {
      this.clsSupported = PerformanceObserver.supportedEntryTypes.includes('layout-shift')
    } catch (e) {
    // do nothing
    }

    var maxLCPTimeSeconds = getConfigurationValue(this.agentIdentifier, 'page_view_timing.maxLCPTimeSeconds') || 60
    var initialHarvestSeconds = getConfigurationValue(this.agentIdentifier, 'page_view_timing.initialHarvestSeconds') || 10
    var harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'page_view_timing.harvestTimeSeconds') || 30

    this.scheduler = new HarvestScheduler('events', {
      onFinished: (...args) => this.onHarvestFinished(...args),
      getPayload: (...args) => this.prepareHarvest(...args),
      onUnload: () => this.recordLcp() // send whatever available LCP we have, if one hasn't already been sent when current window session ends
    }, this)

    registerHandler('timing', (...args) => this.processTiming(...args), this.featureName, this.ee)
    registerHandler('lcp', (...args) => this.updateLatestLcp(...args), this.featureName, this.ee)
    registerHandler('cls', (...args) => this.updateClsScore(...args), this.featureName, this.ee)
    registerHandler('docHidden', msTimestamp => this.endCurrentSession(msTimestamp), this.featureName, this.ee)
    registerHandler('winPagehide', msTimestamp => this.recordPageUnload(msTimestamp), this.featureName, this.ee)

    // After 1 minute has passed, record LCP value if no user interaction has occurred first
    setTimeout(() => {
      this.recordLcp()
      this.lcpRecorded = true
    }, maxLCPTimeSeconds * 1000)

    // send initial data sooner, then start regular
    this.ee.on(`drain-${this.featureName}`, () => { this.scheduler.startTimer(harvestTimeSeconds, initialHarvestSeconds) })

    drain(this.agentIdentifier, this.featureName)
  }

  recordLcp () {
    if (!this.lcpRecorded && this.lcp !== null) {
      var lcpEntry = this.lcp[0]
      var cls = this.lcp[1]
      var networkInfo = this.lcp[2]

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

      // collect 0 only when CLS is supported, since 0 is a valid score
      if (cls > 0 || this.clsSupported) {
        attrs['cls'] = cls
      }

      this.addTiming('lcp', Math.floor(lcpEntry.startTime), attrs, false)
      this.lcpRecorded = true
    }
  }

  updateLatestLcp (lcpEntry, networkInformation) {
    if (this.lcp) {
      var previous = this.lcp[0]
      if (previous.size >= lcpEntry.size) {
        return
      }
    }

    this.lcp = [lcpEntry, this.cls, networkInformation]
  }

  updateClsScore (clsEntry) {
  // this used to be cumulative for the whole page, now we need to split it to a
  // new CLS measurement after 1s between shifts or 5s total
    if ((clsEntry.startTime - this.clsSession.lastEntryTime) > 1000 ||
      (clsEntry.startTime - this.clsSession.firstEntryTime) > 5000) {
      this.clsSession = { value: 0, firstEntryTime: clsEntry.startTime, lastEntryTime: clsEntry.startTime }
    }

    this.clsSession.value += clsEntry.value
    this.clsSession.lastEntryTime = Math.max(this.clsSession.lastEntryTime, clsEntry.startTime)

    // only keep the biggest CLS we've observed
    if (this.cls < this.clsSession.value) this.cls = this.clsSession.value
  }

  /**
   * Add the time of _document visibilitychange to hidden_ to the next PVT harvest == NRDB pageHide attr.
   * @param {number} timestamp
   */
  endCurrentSession (timestamp) {
    if (!this.curSessEndRecorded) { // TO DO: stage 2 - we don't want to capture this timing twice on page navigating away, but it should run again if we return to page and away *again*
      this.addTiming('pageHide', timestamp, null, true)
      this.curSessEndRecorded = true
    }
  }

  /**
   * Add the time of _window pagehide event_ firing to the next PVT harvest == NRDB windowUnload attr.
   */
  recordPageUnload (timestamp) {
    this.addTiming('unload', timestamp, null, true)
    // Because window's pageHide commonly fires before vis change and the final harvest occurs on the earlier of the two, we also have to add that now or it won't make it into the last payload out.
    this.endCurrentSession(timestamp)
  }

  addTiming (name, value, attrs, addCls) {
    attrs = attrs || {}
    // collect 0 only when CLS is supported, since 0 is a valid score
    if ((this.cls > 0 || this.clsSupported) && addCls) {
      attrs['cls'] = this.cls
    }

    this.timings.push({
      name: name,
      value: value,
      attrs: attrs
    })

    handle('pvtAdded', [name, value, attrs], undefined, FEATURE_NAMES.sessionTrace, this.ee)
  }

  processTiming (name, value, attrs) {
  // Upon user interaction, the Browser stops executing LCP logic, so we can send here
  // We're using setTimeout to give the Browser time to finish collecting LCP value
    if (name === 'fi') {
      setTimeout((...args) => this.recordLcp(...args), 0)
    }

    this.addTiming(name, value, attrs, true)
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
