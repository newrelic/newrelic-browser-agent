/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { stringify } from '../../../common/util/stringify'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { cleanURL } from '../../../common/url/clean-url'
import { getInfo } from '../../../common/config/info'
import { getConfiguration } from '../../../common/config/init'
import { getRuntime } from '../../../common/config/runtime'
import { FEATURE_NAME } from '../constants'
import { isBrowserScope } from '../../../common/constants/runtime'
import { AggregateBase } from '../../utils/aggregate-base'
import { warn } from '../../../common/util/console'
import { now } from '../../../common/timing/now'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { deregisterDrain } from '../../../common/drain/drain'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { EventBuffer } from '../../utils/event-buffer'
import { applyFnToProps } from '../../../common/util/traverse'
import { IDEAL_PAYLOAD_SIZE } from '../../../common/constants/agent-constants'
import { UserActionsAggregator } from './user-actions/user-actions-aggregator'

export class Aggregate extends AggregateBase {
  #agentRuntime
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    const agentInit = getConfiguration(this.agentIdentifier)

    this.eventsPerHarvest = 1000
    this.harvestTimeSeconds = agentInit.generic_events.harvestTimeSeconds

    this.referrerUrl = (isBrowserScope && document.referrer) ? cleanURL(document.referrer) : undefined

    this.events = new EventBuffer()

    this.#agentRuntime = getRuntime(this.agentIdentifier)

    this.waitForFlags(['ins']).then(([ins]) => {
      if (!ins) {
        this.blocked = true
        deregisterDrain(this.agentIdentifier, this.featureName)
        return
      }

      if (agentInit.page_action.enabled) {
        registerHandler('api-addPageAction', (timestamp, name, attributes) => {
          this.addEvent({
            ...attributes,
            eventType: 'PageAction',
            timestamp: Math.floor(this.#agentRuntime.timeKeeper.correctRelativeTimestamp(timestamp)),
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

      if (agentInit.user_actions.enabled) {
        this.userActionAggregator = new UserActionsAggregator()
        this.userActionAggregator.on('aggregation-complete', (aggData) => {
          if (!aggData?.event) return
          try {
            const { target, timeStamp, type } = aggData.event
            this.addEvent({
              eventType: 'UserAction',
              timestamp: Math.floor(this.#agentRuntime.timeKeeper.correctRelativeTimestamp(timeStamp)),
              action: type,
              actionCount: aggData.count,
              duration: aggData.relativeMs[aggData.relativeMs.length - 1],
              rageClick: aggData.rageClick,
              relativeMs: aggData.relativeMs,
              target: aggData.selectorPath,
              ...(target?.id && { targetId: target.id }),
              ...(target?.tagName && { targetTag: target.tagName }),
              ...(target?.type && { targetType: target.type }),
              ...(target?.className && { targetClass: target.className })
            })
          } catch (e) {
          // do nothing for now
          }
        })

        registerHandler('ua', (evt) => {
          this.userActionAggregator.process(evt)
        }, this.featureName, this.ee)
      }

      this.harvestScheduler = new HarvestScheduler('ins', { onFinished: (...args) => this.onHarvestFinished(...args) }, this)
      this.harvestScheduler.harvest.on('ins', (...args) => this.onHarvestStarted(...args))
      this.harvestScheduler.startTimer(this.harvestTimeSeconds, 0)

      this.drain()
    })
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
      timestamp: Math.floor(this.#agentRuntime.timeKeeper.correctRelativeTimestamp(now())),
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

    this.events.add(eventAttributes)

    this.checkEventLimits()
  }

  onHarvestStarted (options) {
    /** send whatever UserActions have been aggregated up to this point
     * if we are in a final harvest */
    if (options.isFinalHarvest) this.userActionAggregator?.storeCurrentUserActionInFeature()
    const { userAttributes, atts } = getInfo(this.agentIdentifier)
    if (!this.events.hasData) return
    var payload = ({
      qs: {
        ua: userAttributes,
        at: atts
      },
      body: applyFnToProps(
        { ins: this.events.buffer },
        this.obfuscator.obfuscateString.bind(this.obfuscator), 'string'
      )
    })

    if (options.retry) this.events.hold()
    return payload
  }

  onHarvestFinished (result) {
    if (result && result?.sent && result?.retry && this.events.held.hasData) this.events.unhold()
    else this.events.held.clear()
  }

  checkEventLimits () {
    // check if we've reached any harvest limits...
    if (this.events.bytes > IDEAL_PAYLOAD_SIZE) {
      this.ee.emit(SUPPORTABILITY_METRIC_CHANNEL, ['GenericEvents/Harvest/Max/Seen'])
      this.harvestScheduler.runHarvest()
    }
  }
}
