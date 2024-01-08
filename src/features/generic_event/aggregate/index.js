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
import { now } from '../../../common/timing/now'
import { warn } from '../../../common/util/console'
import { marksAndMeasures } from '../../../common/generic-events/marks-and-measures'
import { pageActions } from '../../../common/generic-events/page-actions'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'ins.harvestTimeSeconds') || 30

    this.referrerUrl = undefined
    this.currentEvents = undefined

    this.events = []

    if (isBrowserScope && document.referrer) this.referrerUrl = cleanURL(document.referrer)

    this.waitForFlags(['ins']).then(([enabled]) => {
      if (enabled) {
        if (getConfigurationValue(this.agentIdentifier, 'marks_and_measures.enabled')) marksAndMeasures.subscribe(this.addEvent.bind(this), true)
        if (getConfigurationValue(this.agentIdentifier, 'page_action.enabled')) pageActions.subscribe(this.addEvent.bind(this), true)

        const scheduler = new HarvestScheduler('ins', { onFinished: (...args) => this.onHarvestFinished(...args) }, this)
        scheduler.harvest.on('ins', (...args) => this.onHarvestStarted(...args))
        scheduler.startTimer(this.harvestTimeSeconds, 0)
      } else {
        this.blocked = true
        this.events = []
      }
    })

    this.drain()
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
  addEvent (obj = {}) {
    if (!obj || !Object.keys(obj).length) return
    if (!obj.eventType) {
      warn('Invalid object passed to generic event aggregate. Missing "eventType".')
      return
    }

    for (let key in obj) {
      const val = obj[key]
      obj[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }

    const eventAttributes = {
      timestamp: Date.now(), // hopefully provided by reporting feature -- falls back to now
      timestampOffset: now(), // hopefully provided by reporting feature -- falls back to now
      timeSinceLoad: (obj.timestampOffset || now()) / 1000, // hopefully provided by reporting feature -- falls back to now
      referrerUrl: this.referrerUrl,
      currentUrl: cleanURL('' + location),
      pageUrl: cleanURL(getRuntime(this.agentIdentifier).origin),
      ...getInfo(this.agentIdentifier).jsAttributes,
      ...obj
    }

    this.events.push(eventAttributes)
  }
}
