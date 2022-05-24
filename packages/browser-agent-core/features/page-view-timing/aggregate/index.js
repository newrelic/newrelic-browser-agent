/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { mapOwn } from '../../../common/util/map-own'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { defaultRegister as register } from '../../../common/event-emitter/register-handler'
import { cleanURL } from '../../../common/url/clean-url'
import { handle } from '../../../common/event-emitter/handle'
import { getInfo } from '../../../common/config/config'
import { FeatureBase } from '../../../common/util/feature-base'
export class Aggregate extends FeatureBase {
  constructor(agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator)
    this.timings = []
    this.timingsSent = []
    this.lcpRecorded = false
    this.lcp = null
    this.clsSupported = false
    this.cls = 0
    this.clsSession = {value: 0, firstEntryTime: 0, lastEntryTime: 0}
    this.pageHideRecorded = false

    this.harvestTimeSeconds = 30

    try {
      clsSupported = PerformanceObserver.supportedEntryTypes.includes('layout-shift') // eslint-disable-line no-undef
    } catch (e) {
    // do nothing
    }

    if (!this.options) this.options = {}
    var maxLCPTimeSeconds = this.options.maxLCPTimeSeconds || 60
    var initialHarvestSeconds = this.options.initialHarvestSeconds || 10
    this.harvestTimeSeconds = this.options.harvestTimeSeconds || 30

    this.scheduler = new HarvestScheduler('events', {
      onFinished: (...args) => this.onHarvestFinished(...args),
      getPayload: (...args) => this.prepareHarvest(...args),
      onUnload: () => this.finalHarvest()
    }, this)

    register('timing', (...args) => this.processTiming(...args), undefined, this.ee)
    register('lcp', (...args) => this.updateLatestLcp(...args), undefined, this.ee)
    register('cls', (...args) => this.updateClsScore(...args), undefined, this.ee)
    register('pageHide', (...args) => this.updatePageHide(...args), undefined, this.ee)

    // final harvest is initiated from the main agent module, but since harvesting
    // here is not initiated by the harvester, we need to subscribe to the unload event
    // separately
    // subscribeToUnload((...args) => this.finalHarvest(...args))

    // After 1 minute has passed, record LCP value if no user interaction has occurred first
    setTimeout(() => {
      this.recordLcp()
      this.lcpRecorded = true
    }, maxLCPTimeSeconds * 1000)

    // send initial data sooner, then start regular
    this.scheduler.startTimer(this.harvestTimeSeconds, initialHarvestSeconds)
  }

  recordLcp() {
    if (!this.lcpRecorded && this.lcp !== null) {
      var lcpEntry = this.lcp[0]
      var cls = this.lcp[1]
      var networkInfo = this.lcp[2]

      var attrs = {
        'size': lcpEntry.size,
        'eid': lcpEntry.id
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

  updateLatestLcp(lcpEntry, networkInformation) {
    if (this.lcp) {
      var previous = this.lcp[0]
      if (previous.size >= lcpEntry.size) {
        return
      }
    }

    this.lcp = [lcpEntry, this.cls, networkInformation]
  }

  updateClsScore(clsEntry) {
  // this used to be cumulative for the whole page, now we need to split it to a
  // new CLS measurement after 1s between shifts or 5s total
    if ((clsEntry.startTime - this.clsSession.lastEntryTime) > 1000 ||
      (clsEntry.startTime - this.clsSession.firstEntryTime) > 5000) {
      this.clsSession = {value: 0, firstEntryTime: clsEntry.startTime, lastEntryTime: clsEntry.startTime}
    }

    this.clsSession.value += clsEntry.value
    this.clsSession.lastEntryTime = Math.max(this.clsSession.lastEntryTime, clsEntry.startTime)

    // only keep the biggest CLS we've observed
    if (this.cls < this.clsSession.value) this.cls = this.clsSession.value
  }

  updatePageHide(timestamp) {
    if (!this.pageHideRecorded) {
      this.addTiming('pageHide', timestamp, null, true)
      this.pageHideRecorded = true
    }
  }

  recordUnload() {
    this.updatePageHide(now())
    this.addTiming('unload', now(), null, true)
  }

  addTiming(name, value, attrs, addCls) {
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

    handle('pvtAdded', [name, value, attrs])
  }

  processTiming(name, value, attrs) {
  // Upon user interaction, the Browser stops executing LCP logic, so we can send here
  // We're using setTimeout to give the Browser time to finish collecting LCP value
    if (name === 'fi') {
      setTimeout(this.recordLcp, 0)
    }

    this.addTiming(name, value, attrs, true)
  }

  onHarvestFinished(result) {
    if (result.retry && this.timingsSent.length > 0) {
      for (var i = 0; i < this.timingsSent.length; i++) {
        this.timings.push(this.timingsSent[i])
      }
      this.timingsSent = []
    }
  }

  finalHarvest() {
    this.recordLcp()
    this.recordUnload()
    var payload = this.prepareHarvest({ retry: false })
    this.scheduler.harvest.send('events', payload, { unload: true })
  }

  appendGlobalCustomAttributes(timing) {
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
  prepareHarvest(options) {
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
  getPayload(data) {
    var addString = getAddStringContext()

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

