/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { stringify } from '../../../common/util/stringify'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { cleanURL } from '../../../common/url/clean-url'
import { FEATURE_NAME } from '../constants'
import { initialLocation, isBrowserScope } from '../../../common/constants/runtime'
import { AggregateBase } from '../../utils/aggregate-base'
import { warn } from '../../../common/util/console'
import { now } from '../../../common/timing/now'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { EventBuffer } from '../../utils/event-buffer'
import { applyFnToProps } from '../../../common/util/traverse'
import { IDEAL_PAYLOAD_SIZE } from '../../../common/constants/agent-constants'
import { UserActionsAggregator } from './user-actions/user-actions-aggregator'
import { isIFrameWindow } from '../../../common/dom/iframe'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    this.eventsPerHarvest = 1000
    this.harvestTimeSeconds = agentRef.init.generic_events.harvestTimeSeconds

    this.referrerUrl = (isBrowserScope && document.referrer) ? cleanURL(document.referrer) : undefined
    this.events = new EventBuffer()

    this.waitForFlags(['ins']).then(([ins]) => {
      if (!ins) {
        this.blocked = true
        this.deregisterDrain()
        return
      }

      const preHarvestMethods = []

      if (agentRef.init.page_action.enabled) {
        registerHandler('api-addPageAction', (timestamp, name, attributes) => {
          this.addEvent({
            ...attributes,
            eventType: 'PageAction',
            timestamp: Math.floor(this.agentRef.runtime.timeKeeper.correctRelativeTimestamp(timestamp)),
            timeSinceLoad: timestamp / 1000,
            actionName: name,
            referrerUrl: this.referrerUrl,
            ...(isBrowserScope && {
              browserWidth: window.document.documentElement?.clientWidth,
              browserHeight: window.document.documentElement?.clientHeight
            })
          })
        }, this.featureName, this.ee)
      }

      if (isBrowserScope && agentRef.init.user_actions.enabled) {
        this.userActionAggregator = new UserActionsAggregator()

        this.addUserAction = (aggregatedUserAction) => {
          try {
            /** The aggregator process only returns an event when it is "done" aggregating -
             * so we still need to validate that an event was given to this method before we try to add */
            if (aggregatedUserAction?.event) {
              const { target, timeStamp, type } = aggregatedUserAction.event
              this.addEvent({
                eventType: 'UserAction',
                timestamp: Math.floor(this.agentRef.runtime.timeKeeper.correctRelativeTimestamp(timeStamp)),
                action: type,
                actionCount: aggregatedUserAction.count,
                actionDuration: aggregatedUserAction.relativeMs[aggregatedUserAction.relativeMs.length - 1],
                actionMs: aggregatedUserAction.relativeMs,
                rageClick: aggregatedUserAction.rageClick,
                target: aggregatedUserAction.selectorPath,
                ...(isIFrameWindow(window) && { iframe: true }),
                ...(target?.id && { targetId: target.id }),
                ...(target?.tagName && { targetTag: target.tagName }),
                ...(target?.type && { targetType: target.type }),
                ...(target?.className && { targetClass: target.className })
              })
            }
          } catch (e) {
            // do nothing for now
          }
        }

        registerHandler('ua', (evt) => {
          /** the processor will return the previously aggregated event if it has been completed by processing the current event */
          this.addUserAction(this.userActionAggregator.process(evt))
        }, this.featureName, this.ee)

        preHarvestMethods.push((options = {}) => {
          /** send whatever UserActions have been aggregated up to this point
           * if we are in a final harvest. By accessing the aggregationEvent, the aggregation is then force-cleared */
          if (options.isFinalHarvest) this.addUserAction(this.userActionAggregator.aggregationEvent)
        })
      }

      /**
       * is it worth complicating the agent and skipping the POs for single repeating queries? maybe,
       * but right now it was less desirable simply because it is a nice benefit of populating the event buffer
       * immediately as events happen for payload evaluation purposes and that becomes a little more chaotic
       * with an arbitrary query method. note: eventTypes: [...types] does not support the 'buffered' flag so we have
       * to create up to two PO's here.
       */
      const performanceTypesToCapture = [...(agentInit.performance.capture_marks ? ['mark'] : []), ...(agentInit.performance.capture_measures ? ['measure'] : [])]
      if (performanceTypesToCapture.length) {
        try {
          performanceTypesToCapture.forEach(type => {
            if (PerformanceObserver.supportedEntryTypes.includes(type)) {
              const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                  this.addEvent({
                    eventType: 'BrowserPerformance',
                    timestamp: Math.floor(this.#agentRuntime.timeKeeper.correctRelativeTimestamp(entry.startTime)),
                    entryName: entry.name,
                    entryDuration: entry.duration,
                    entryType: type,
                    ...(entry.detail && { entryDetail: entry.detail })
                  })
                })
              })
              observer.observe({ buffered: true, type })
            }
          })
        } catch (err) {
        // Something failed in our set up, likely the browser does not support PO's... do nothing
        }
      }

      this.harvestScheduler = new HarvestScheduler('ins', { onFinished: (...args) => this.onHarvestFinished(...args) }, this)
      this.harvestScheduler.harvest.on('ins', (...args) => {
        preHarvestMethods.forEach(fn => fn(...args))
        return this.onHarvestStarted(...args)
      })
      this.harvestScheduler.startTimer(this.harvestTimeSeconds, 0)

      this.drain()
    })
  }

  // WARNING: Insights times are in seconds. EXCEPT timestamp, which is in ms.
  /** Some keys are set by the query params or request headers sent with the harvest and override the body values, so check those before adding new standard body values...
   * see harvest.js#baseQueryString for more info on the query params
   * Notably:
   * * name: set by the `t=` query param
   * * appId: set by the `a=` query param
   * * standalone: set by the `sa=` query param
   * * session: set by the `s=` query param
   * * sessionTraceId: set by the `ptid=` query param
   * * userAgent*: set by the userAgent header
   * @param {object=} obj the event object for storing in the event buffer
   * @returns void
   */
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
      timestamp: Math.floor(this.agentRef.runtime.timeKeeper.correctRelativeTimestamp(now())),
      /** all generic events require pageUrl(s) */
      pageUrl: cleanURL('' + initialLocation),
      currentUrl: cleanURL('' + location)
    }

    const eventAttributes = {
      /** Agent-level custom attributes */
      ...(this.agentRef.info.jsAttributes || {}),
      /** Fallbacks for required properties in-case the event did not supply them, should take precedence over agent-level custom attrs */
      ...defaultEventAttributes,
      /** Event-specific attributes take precedence over agent-level custom attributes and fallbacks */
      ...obj
    }

    this.events.add(eventAttributes)

    this.checkEventLimits()
  }

  onHarvestStarted (options) {
    const { userAttributes, atts } = this.agentRef.info
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
    else this.events.clear()

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
