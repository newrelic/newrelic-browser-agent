/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee } from '../../../common/event-emitter/contextual-ee'
import { mapOwn } from '../../../common/util/map-own'
import { stringify } from '../../../common/util/stringify'
import { registerHandler as register } from '../../../common/event-emitter/register-handler'
import { on as onHarvest } from '../../../common/harvest/harvest'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { cleanURL } from '../../../common/url/clean-url'
import { getConfigurationValue, getInfo, runtime, setInfo } from '../../../common/config/config'

var eventsPerMinute = 240
// var harvestTimeSeconds = config.getConfiguration('ins.harvestTimeSeconds') || 30
var harvestTimeSeconds = getConfigurationValue('ins.harvestTimeSeconds') || 30
var eventsPerHarvest = eventsPerMinute * harvestTimeSeconds / 60
var referrerUrl
var currentEvents

var events = []
var att = {}
setInfo({jsAttributes: att})

if (document.referrer) referrerUrl = cleanURL(document.referrer)

export function initialize() {
  console.log("initialize pageActions!")

  register('api-setCustomAttribute', setCustomAttribute, 'api')

  ee.on('feat-ins', function () {
    console.log("feat-ins!")
    // TODO 
    // Check why this isnt firing when called from the API
    // i think its not getting the NREUM info before making the call to get features
    register('api-addPageAction', addPageAction)

    onHarvest('ins', onHarvestStarted)
    var scheduler = new HarvestScheduler(loader, 'ins', { onFinished: onHarvestFinished })
    scheduler.startTimer(harvestTimeSeconds, 0)
  })
}

function onHarvestStarted (options) {
  const { userAttributes, atts } = getInfo()
  var payload = ({
    qs: {
      ua: userAttributes,
      at: atts
    },
    body: {
      ins: events
    }
  })

  if (options.retry) {
    currentEvents = events
  }

  events = []
  return payload
}

function onHarvestFinished (result) {
  if (result && result.sent && result.retry && currentEvents) {
    events = events.concat(currentEvents)
    currentEvents = null
  }
}

// WARNING: Insights times are in seconds. EXCEPT timestamp, which is in ms.
function addPageAction (t, name, attributes) {
  console.log("add a page action!", t, name, attributes)
  if (events.length >= eventsPerHarvest) return
  var width
  var height
  var eventAttributes = {}

  if (typeof window !== 'undefined' && window.document && window.document.documentElement) {
    // Doesn't include the nav bar when it disappears in mobile safari
    // https://github.com/jquery/jquery/blob/10399ddcf8a239acc27bdec9231b996b178224d3/src/dimensions.js#L23
    width = window.document.documentElement.clientWidth
    height = window.document.documentElement.clientHeight
  }

  var defaults = {
    timestamp: t + runtime.offset,
    timeSinceLoad: t / 1000,
    browserWidth: width,
    browserHeight: height,
    referrerUrl: referrerUrl,
    currentUrl: cleanURL('' + location),
    pageUrl: cleanURL(runtime.origin),
    eventType: 'PageAction'
  }

  mapOwn(defaults, set)
  mapOwn(att, set)
  if (attributes && typeof attributes === 'object') {
    mapOwn(attributes, set)
  }
  eventAttributes.actionName = name || ''

  events.push(eventAttributes)

  function set (key, val) {
    eventAttributes[key] = (val && typeof val === 'object' ? stringify(val) : val)
  }
}

function setCustomAttribute (t, key, value) {
  att[key] = value
}
