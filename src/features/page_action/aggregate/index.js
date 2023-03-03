/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { mapOwn } from '../../../common/util/map-own'
import { stringify } from '../../../common/util/stringify'
import { registerHandler as register } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { cleanURL } from '../../../common/url/clean-url'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'
import { drain } from '../../../common/drain/drain'
import { isBrowserScope } from '../../../common/util/global-scope'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    this.eventsPerMinute = 240
    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'page_action.harvestTimeSeconds') || getConfigurationValue(this.agentIdentifier, 'ins.harvestTimeSeconds') || 30
    this.eventsPerHarvest = this.eventsPerMinute * this.harvestTimeSeconds / 60
    this.referrerUrl
    this.currentEvents

    this.events = []

    this.att = getInfo(this.agentIdentifier).jsAttributes // per-agent, aggregators-shared info context

    if (isBrowserScope && document.referrer) this.referrerUrl = cleanURL(document.referrer)

    register('api-addPageAction', (...args) => this.addPageAction(...args), this.featureName, this.ee)

    var scheduler = new HarvestScheduler('ins', { onFinished: (...args) => this.onHarvestFinished(...args) }, this)
    scheduler.harvest.on('ins', (...args) => this.onHarvestStarted(...args))
    this.ee.on(`drain-${this.featureName}`, () => { if (!this.blocked) scheduler.startTimer(this.harvestTimeSeconds, 0) })

    // if rum response determines that customer lacks entitlements for ins endpoint, block it
    register('block-ins', () => {
      this.blocked = true
      scheduler.stopTimer(true)
    }, this.featureName, this.ee)

    drain(this.agentIdentifier, this.featureName)
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
    if (this.events.length >= this.eventsPerHarvest || this.blocked) return
    var width
    var height
    var eventAttributes = {}

    if (isBrowserScope && window.document.documentElement) {
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
    mapOwn(getInfo(this.agentIdentifier).jsAttributes, set)
    if (attributes && typeof attributes === 'object') {
      mapOwn(attributes, set)
    }
    eventAttributes.actionName = name || ''

    this.events.push(eventAttributes)

    function set (key, val) {
      eventAttributes[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  }
}
