/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { mapOwn } from '../../../common/util/map-own'
import { stringify } from '../../../common/util/stringify'
import { registerHandler as register } from '../../../common/event-emitter/register-handler'
// import { on as onHarvest } from '../../../common/harvest/harvest'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { cleanURL } from '../../../common/url/clean-url'
import { getConfigurationValue, getInfo, getRuntime, setInfo } from '../../../common/config/config'
import { FeatureBase } from '../../../common/util/feature-base'

export class Aggregate extends FeatureBase {
  constructor(agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator)
    this.eventsPerMinute = 240
    this.harvestTimeSeconds = getConfigurationValue('ins.harvestTimeSeconds') || 30
    this.eventsPerHarvest = this.eventsPerMinute * this.harvestTimeSeconds / 60
    this.referrerUrl
    this.currentEvents

    this.events = []
    this.att = {}
    setInfo(this.agentIdentifier, {jsAttributes: this.att})

    if (document.referrer) this.referrerUrl = cleanURL(document.referrer)

    register('api-setCustomAttribute', (...args) => this.setCustomAttribute(...args), 'api', this.ee)

    this.ee.on('feat-ins', function () {
      register('api-addPageAction', (...args) => this.addPageAction(...args), undefined, this.ee)

      var scheduler = new HarvestScheduler('ins', {onFinished: (...args) => this.onHarvestFinished(...args)}, this)
      scheduler.harvest.on('ins', (...args) => this.onHarvestStarted(...args))
      scheduler.startTimer(this.harvestTimeSeconds, 0)
    })
  }

  onHarvestStarted (options) {
    const { userAttributes, atts } = getInfo(this.agentIdentifier)
    var payload = ({
      qs: {
        ua: userAttributes,
        at: atts
      },
      body: {
        ins: this.events
      }
    })

    if (options.retry) {
      this.currentEvents = this.events
    }

    this.events = []
    return payload
  }

  onHarvestFinished (result) {
    if (result && result.sent && result.retry && this.currentEvents) {
      this.events = this.events.concat(this.currentEvents)
      this.currentEvents = null
    }
  }

  // WARNING: Insights times are in seconds. EXCEPT timestamp, which is in ms.
  addPageAction (t, name, attributes) {
    if (this.events.length >= this.eventsPerHarvest) return
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
      timestamp: t + getRuntime(this.agentIdentifier).offset,
      timeSinceLoad: t / 1000,
      browserWidth: width,
      browserHeight: height,
      referrerUrl: this.referrerUrl,
      currentUrl: cleanURL('' + location),
      pageUrl: cleanURL(getRuntime(this.agentIdentifier).origin),
      eventType: 'PageAction'
    }

    mapOwn(defaults, set)
    mapOwn(this.att, set)
    if (attributes && typeof attributes === 'object') {
      mapOwn(attributes, set)
    }
    eventAttributes.actionName = name || ''

    this.events.push(eventAttributes)

    function set (key, val) {
      eventAttributes[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  }

  setCustomAttribute (t, key, value) {
    this.att[key] = value
  }
}

