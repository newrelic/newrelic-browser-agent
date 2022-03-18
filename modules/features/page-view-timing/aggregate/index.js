/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { mapOwn } from '../../../common/util/map-own'
import { send as sendHarvest } from '../../../common/harvest/harvest'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler';
import { defaultRegister as register} from '../../../common/event-emitter/register-handler';
import { subscribeToUnload }  from '../../../common/unload/unload';
import { cleanURL } from '../../../common/url/clean-url';
import { handle } from '../../../common/event-emitter/handle';
import { getInfo } from '../../../common/config/config';

export var timings = []
var timingsSent = []
var lcpRecorded = false
var lcp = null
var clsSupported = false
var cls = 0
var clsSession = {value: 0, firstEntryTime: 0, lastEntryTime: 0}
var pageHideRecorded = false

var harvestTimeSeconds = 30

export function initialize(options) {
  if (!isEnabled(options)) return

  try {
    clsSupported = PerformanceObserver.supportedEntryTypes.includes('layout-shift') // eslint-disable-line no-undef
  } catch (e) {}

  if (!options) options = {}
  var maxLCPTimeSeconds = options.maxLCPTimeSeconds || 60
  var initialHarvestSeconds = options.initialHarvestSeconds || 10
  harvestTimeSeconds = options.harvestTimeSeconds || 30

  console.log("pvt init")
  var scheduler = new HarvestScheduler('events', { onFinished: onHarvestFinished, getPayload: prepareHarvest })

  register('timing', processTiming)
  register('lcp', updateLatestLcp)
  register('cls', updateClsScore)
  register('pageHide', updatePageHide)

  // final harvest is initiated from the main agent module, but since harvesting
  // here is not initiated by the harvester, we need to subscribe to the unload event
  // separately
  subscribeToUnload(finalHarvest)

  // After 1 minute has passed, record LCP value if no user interaction has occurred first
  setTimeout(function() {
    recordLcp()
    lcpRecorded = true
  }, maxLCPTimeSeconds * 1000)

  // send initial data sooner, then start regular
  scheduler.startTimer(harvestTimeSeconds, initialHarvestSeconds)
}

function recordLcp() {
  if (!lcpRecorded && lcp !== null) {
    var lcpEntry = lcp[0]
    var cls = lcp[1]
    var networkInfo = lcp[2]

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
    if (cls > 0 || clsSupported) {
      attrs['cls'] = cls
    }

    addTiming('lcp', Math.floor(lcpEntry.startTime), attrs, false)
    lcpRecorded = true
  }
}

function updateLatestLcp(lcpEntry, networkInformation) {
    console.log("updateLatestLcp")
  if (lcp) {
    var previous = lcp[0]
    if (previous.size >= lcpEntry.size) {
      return
    }
  }

  lcp = [lcpEntry, cls, networkInformation]
}

function updateClsScore(clsEntry) {
    console.log("updateClsScore", arguments)
  // this used to be cumulative for the whole page, now we need to split it to a
  // new CLS measurement after 1s between shifts or 5s total
  if ((clsEntry.startTime - clsSession.lastEntryTime) > 1000 ||
      (clsEntry.startTime - clsSession.firstEntryTime) > 5000) {
    clsSession = {value: 0, firstEntryTime: clsEntry.startTime, lastEntryTime: clsEntry.startTime}
  }

  clsSession.value += clsEntry.value
  clsSession.lastEntryTime = Math.max(clsSession.lastEntryTime, clsEntry.startTime)

  // only keep the biggest CLS we've observed
  if (cls < clsSession.value) cls = clsSession.value
}

function updatePageHide(timestamp) {
  if (!pageHideRecorded) {
    addTiming('pageHide', timestamp, null, true)
    pageHideRecorded = true
  }
}

function recordUnload() {
  updatePageHide(now())
  addTiming('unload', now(), null, true)
}

export function addTiming(name, value, attrs, addCls) {
  console.log("add timing")
  attrs = attrs || {}
  // collect 0 only when CLS is supported, since 0 is a valid score
  if ((cls > 0 || clsSupported) && addCls) {
    attrs['cls'] = cls
  }

  timings.push({
    name: name,
    value: value,
    attrs: attrs
  })

  handle('pvtAdded', [name, value, attrs])
}

function processTiming(name, value, attrs) {
    console.log("processTiming", name, value)
  // Upon user interaction, the Browser stops executing LCP logic, so we can send here
  // We're using setTimeout to give the Browser time to finish collecting LCP value
  if (name === 'fi') {
    setTimeout(recordLcp, 0)
  }

  addTiming(name, value, attrs, true)
}

function onHarvestFinished(result) {
  if (result.retry && timingsSent.length > 0) {
    for (var i = 0; i < timingsSent.length; i++) {
      timings.push(timingsSent[i])
    }
    timingsSent = []
  }
}

export function finalHarvest() {
  recordLcp()
  recordUnload()
  var payload = prepareHarvest({ retry: false })
  sendHarvest('events', loader, payload, { unload: true })
}

function appendGlobalCustomAttributes(timing) {
  var timingAttributes = timing.attrs || {}
  var customAttributes = getInfo().jsAttributes || {}

  var reservedAttributes = ['size', 'eid', 'cls', 'type', 'fid', 'elTag', 'elUrl', 'net-type',
    'net-etype', 'net-rtt', 'net-dlink']
  mapOwn(customAttributes, function (key, val) {
    if (reservedAttributes.indexOf(key) < 0) {
      timingAttributes[key] = val
    }
  })
}

// serialize and return current timing data, clear and save current data for retry
function prepareHarvest(options) {
    console.log("timings.length", timings.length)
  if (timings.length === 0) return

  var payload = getPayload(timings)
  if (options.retry) {
    for (var i = 0; i < timings.length; i++) {
      timingsSent.push(timings[i])
    }
  }
  timings = []
  return { body: { e: payload } }
}


// serialize array of timing data
export function getPayload(data) {
  var addString = getAddStringContext()

  var payload = 'bel.6;'

  for (var i = 0; i < data.length; i++) {
    var timing = data[i]

    payload += 'e,'
    payload += addString(timing.name) + ','
    payload += nullable(timing.value, numeric, false) + ','

    appendGlobalCustomAttributes(timing)

    var attrParts = addCustomAttributes(timing.attrs, addString)
    if (attrParts && attrParts.length > 0) {
      payload += numeric(attrParts.length) + ';' + attrParts.join(';')
    }

    if ((i + 1) < data.length) payload += ';'
  }

  return payload
}

function isEnabled(config) {
  // collect page view timings unless the feature is explicitly disabled
  if (config && config.enabled === false) {
    return false
  }
  return true
}
