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
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { applyFnToProps } from '../../../common/util/traverse'

export class Aggregate extends AggregateBase {
  #agentRuntime
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.eventsPerHarvest = 1000
    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'generic_events.harvestTimeSeconds')

    this.referrerUrl = (isBrowserScope && document.referrer) ? cleanURL(document.referrer) : undefined
    this.currentEvents = []

    this.events = []
    this.overflow = []

    this.#agentRuntime = getRuntime(this.agentIdentifier)

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
            referrerUrl: this.referrerUrl,
            currentUrl: cleanURL('' + location),
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
      body: applyFnToProps(
        { ins: harvestEvents },
        this.obfuscator.obfuscateString.bind(this.obfuscator), 'string'
      )
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
      warn(44)
      return
    }

    for (let key in obj) {
      let val = obj[key]
      obj[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }

    const defaultEventAttributes = {
      /** should be overridden by the event-specific attributes, but just in case -- set it to now() */
      timestamp: this.#agentRuntime.timeKeeper.convertRelativeTimestamp(now()),
      /** all generic events require a pageUrl */
      pageUrl: cleanURL(getRuntime(this.agentIdentifier).origin)
    }

    const eventAttributes = {
      /** Agent-level custom attributes */
      ...(getInfo(this.agentIdentifier).jsAttributes || {}),
      /** Fallbacks for required properties in-case the event did not supply them, should take precedence over agent-level custom attrs */
      ...defaultEventAttributes,
      /** Event-specific attributes take precedence over agent-level custom attributes and fallbacks */
      ...obj
    }

    this.events.push(eventAttributes)

    // check if we've reached the harvest limit...
    if (this.events.length >= this.eventsPerHarvest) {
      this.ee.emit(SUPPORTABILITY_METRIC_CHANNEL, ['GenericEvents/Harvest/Max/Seen'])
      this.overflow = [...this.overflow, ...this.events.splice(0, Infinity)]
      this.harvestScheduler.runHarvest()
    }
  }
}
