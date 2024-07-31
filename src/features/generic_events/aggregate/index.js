/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { stringify } from '../../../common/util/stringify'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { cleanURL } from '../../../common/url/clean-url'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { FEATURE_NAME } from '../constants'
import { isBrowserScope } from '../../../common/constants/runtime'
import { AggregateBase } from '../../utils/aggregate-base'
import { warn } from '../../../common/util/console'
import { now } from '../../../common/timing/now'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { deregisterDrain } from '../../../common/drain/drain'

export class Aggregate extends AggregateBase {
  #agentRuntime
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.eventsPerHarvest = 1000
    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'generic_events.harvestTimeSeconds')

    this.referrerUrl = undefined
    this.currentEvents = []

    this.events = []
    this.overflow = []

    this.#agentRuntime = getRuntime(this.agentIdentifier)

    if (isBrowserScope && document.referrer) this.referrerUrl = cleanURL(document.referrer)

    this.waitForFlags(['ins']).then(([ins]) => {
      if (!ins) {
        this.blocked = true
        deregisterDrain(this.agentIdentifier, this.featureName)
        return
      }

      if (getConfigurationValue(this.agentIdentifier, 'page_action.enabled')) {
        registerHandler('api-addPageAction', (timestamp, name, attributes) => {
          this.addEvent({
            ...attributes,
            eventType: 'PageAction',
            timestamp: this.#agentRuntime.timeKeeper.convertRelativeTimestamp(timestamp),
            timeSinceLoad: timestamp / 1000,
            actionName: name,
            ...(isBrowserScope && {
              browserWidth: window.document.documentElement?.clientWidth,
              browserHeight: window.document.documentElement?.clientHeight
            })
          })
        }, this.featureName, this.ee)
      }

      this.harvestScheduler = new HarvestScheduler('ins', { onFinished: (...args) => this.onHarvestFinished(...args) }, this)
      this.harvestScheduler.harvest.on('ins', (...args) => this.onHarvestStarted(...args))
      this.harvestScheduler.startTimer(this.harvestTimeSeconds, 0)

      this.drain()
    })
  }

  onHarvestStarted (options) {
    const { userAttributes, atts } = getInfo(this.agentIdentifier)
    const harvestEvents = this.overflow.length ? this.overflow.splice(0, Infinity) : this.events.splice(0, Infinity)
    var payload = ({
      qs: {
        ua: userAttributes,
        at: atts
      },
      body: {
        ins: harvestEvents
      }
    })

    if (options.retry) {
      this.currentEvents = harvestEvents
    }

    return payload
  }

  onHarvestFinished (result) {
    if (result && result.sent && result.retry && this.currentEvents.length) {
      this.events = this.currentEvents.concat(this.events)
      this.currentEvents = []
    }
  }

  // WARNING: Insights times are in seconds. EXCEPT timestamp, which is in ms.
  addEvent (obj = {}) {
    if (!obj || !Object.keys(obj).length) return
    if (!obj.eventType) {
      warn('Invalid object passed to generic event aggregate. Missing "eventType".')
      return
    }

    for (let key in obj) {
      let val = obj[key]
      if (key === 'timestamp') val = this.#agentRuntime.timeKeeper.correctAbsoluteTimestamp(val)
      obj[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }

    const eventAttributes = {
      /** Common attributes shared on all generic events */
      referrerUrl: this.referrerUrl,
      currentUrl: cleanURL('' + location),
      pageUrl: cleanURL(getRuntime(this.agentIdentifier).origin),
      /** Agent-level custom attributes */
      ...(getInfo(this.agentIdentifier).jsAttributes || {}),
      /** Event-specific attributes take precedence over everything else */
      ...obj
    }

    /** should have been provided by reporting feature -- but falls back to now if not */
    eventAttributes.timestamp ??= this.#agentRuntime.timeKeeper.convertRelativeTimestamp(now())

    this.events.push(eventAttributes)

    // check if we've reached the harvest limit...
    if (this.events.length >= this.eventsPerHarvest) {
      this.overflow = [...this.overflow, ...this.events.splice(0, Infinity)]
      this.harvestScheduler.runHarvest()
    }
  }
}
