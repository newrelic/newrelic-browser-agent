/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { stringify } from '../../../common/util/stringify'
import { cleanURL } from '../../../common/url/clean-url'
import { FEATURE_NAME, RESERVED_EVENT_TYPES } from '../constants'
import { globalScope, initialLocation, isBrowserScope } from '../../../common/constants/runtime'
import { AggregateBase } from '../../utils/aggregate-base'
import { warn } from '../../../common/util/console'
import { now } from '../../../common/timing/now'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { applyFnToProps } from '../../../common/util/traverse'
import { UserActionsAggregator } from './user-actions/user-actions-aggregator'
import { isIFrameWindow } from '../../../common/dom/iframe'
import { isPureObject } from '../../../common/util/type-check'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)
    this.eventsPerHarvest = 1000
    this.referrerUrl = (isBrowserScope && document.referrer) ? cleanURL(document.referrer) : undefined

    this.waitForFlags(['ins']).then(([ins]) => {
      if (!ins) {
        this.blocked = true
        this.deregisterDrain()
        return
      }

      this.trackSupportabilityMetrics()

      registerHandler('api-recordCustomEvent', (timestamp, eventType, attributes) => {
        if (RESERVED_EVENT_TYPES.includes(eventType)) return warn(46)
        this.addEvent({
          eventType,
          timestamp: this.toEpoch(timestamp),
          ...attributes
        })
      }, this.featureName, this.ee)

      if (agentRef.init.page_action.enabled) {
        registerHandler('api-addPageAction', (timestamp, name, attributes) => {
          this.addEvent({
            ...attributes,
            eventType: 'PageAction',
            timestamp: this.toEpoch(timestamp),
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

      let addUserAction = () => { /** no-op */ }
      if (isBrowserScope && agentRef.init.user_actions.enabled) {
        this.userActionAggregator = new UserActionsAggregator()
        this.harvestOpts.beforeUnload = () => addUserAction?.(this.userActionAggregator.aggregationEvent)

        addUserAction = (aggregatedUserAction) => {
          try {
            /** The aggregator process only returns an event when it is "done" aggregating -
             * so we still need to validate that an event was given to this method before we try to add */
            if (aggregatedUserAction?.event) {
              const { target, timeStamp, type } = aggregatedUserAction.event
              this.addEvent({
                eventType: 'UserAction',
                timestamp: this.toEpoch(timeStamp),
                action: type,
                actionCount: aggregatedUserAction.count,
                actionDuration: aggregatedUserAction.relativeMs[aggregatedUserAction.relativeMs.length - 1],
                actionMs: aggregatedUserAction.relativeMs,
                rageClick: aggregatedUserAction.rageClick,
                target: aggregatedUserAction.selectorPath,
                ...(isIFrameWindow(window) && { iframe: true }),
                ...(this.agentRef.init.user_actions.elementAttributes.reduce((acc, field) => {
                  /** prevent us from capturing an obscenely long value */
                  if (canTrustTargetAttribute(field)) acc[targetAttrName(field)] = String(target[field]).trim().slice(0, 128)
                  return acc
                }, {})),
                ...aggregatedUserAction.nearestTargetFields
              })

              /**
               * Returns the original target field name with `target` prepended and camelCased
               * @param {string} originalFieldName
               * @returns {string} the target field name
               */
              function targetAttrName (originalFieldName) {
                /** preserve original renaming structure for pre-existing field maps */
                if (originalFieldName === 'tagName') originalFieldName = 'tag'
                if (originalFieldName === 'className') originalFieldName = 'class'
                /** return the original field name, cap'd and prepended with target to match formatting */
                return `target${originalFieldName.charAt(0).toUpperCase() + originalFieldName.slice(1)}`
              }

              /**
               * Only trust attributes that exist on HTML element targets, which excludes the window and the document targets
               * @param {string} attribute The attribute to check for on the target element
               * @returns {boolean} Whether the target element has the attribute and can be trusted
               */
              function canTrustTargetAttribute (attribute) {
                return !!(aggregatedUserAction.selectorPath !== 'window' && aggregatedUserAction.selectorPath !== 'document' && target instanceof HTMLElement && target?.[attribute])
              }
            }
          } catch (e) {
            // do nothing for now
          }
        }

        registerHandler('ua', (evt) => {
          /** the processor will return the previously aggregated event if it has been completed by processing the current event */
          addUserAction(this.userActionAggregator.process(evt, this.agentRef.init.user_actions.elementAttributes))
        }, this.featureName, this.ee)
      }

      /**
       * is it worth complicating the agent and skipping the POs for single repeating queries? maybe,
       * but right now it was less desirable simply because it is a nice benefit of populating the event buffer
       * immediately as events happen for payload evaluation purposes and that becomes a little more chaotic
       * with an arbitrary query method. note: eventTypes: [...types] does not support the 'buffered' flag so we have
       * to create up to two PO's here.
       */
      const performanceTypesToCapture = [...(agentRef.init.performance.capture_marks ? ['mark'] : []), ...(agentRef.init.performance.capture_measures ? ['measure'] : [])]
      if (performanceTypesToCapture.length) {
        try {
          performanceTypesToCapture.forEach(type => {
            if (PerformanceObserver.supportedEntryTypes.includes(type)) {
              const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                  try {
                    this.reportSupportabilityMetric('Generic/Performance/' + type + '/Bytes-Added')
                    const detailObj = agentRef.init.performance.capture_detail ? createDetailAttrs(entry.detail) : {}
                    this.addEvent({
                      ...detailObj,
                      eventType: 'BrowserPerformance',
                      timestamp: this.toEpoch(entry.startTime),
                      entryName: cleanURL(entry.name),
                      entryDuration: entry.duration,
                      entryType: type
                    })

                    function createDetailAttrs (detail) {
                      if (detail === null || detail === undefined) return {}
                      else if (!isPureObject(detail)) return { entryDetail: detail }
                      else return flattenJSON(detail)

                      function flattenJSON (nestedJSON, parentKey = 'entryDetail') {
                        let items = {}
                        if (nestedJSON === null || nestedJSON === undefined) return items
                        Object.keys(nestedJSON).forEach(key => {
                          let newKey = parentKey + '.' + key
                          if (isPureObject(nestedJSON[key])) {
                            Object.assign(items, flattenJSON(nestedJSON[key], newKey))
                          } else {
                            if (nestedJSON[key] !== null && nestedJSON[key] !== undefined) items[newKey] = nestedJSON[key]
                          }
                        })
                        return items
                      }
                    }
                  } catch (err) {
                  }
                })
              })
              observer.observe({ buffered: true, type })
            }
          })
        } catch (err) {
        // Something failed in our set up, likely the browser does not support PO's... do nothing
        }
      }

      if (isBrowserScope && agentRef.init.performance.resources.enabled) {
        registerHandler('browserPerformance.resource', (entry) => {
          try {
            // convert the entry to a plain object and separate the name and duration from the object
            // you need to do this to be able to spread it into the addEvent call later, and name and duration
            // would be duplicative of entryName and entryDuration and are protected keys in NR1
            const { name, duration, ...entryObject } = entry.toJSON()

            let firstParty = false
            try {
              const entryDomain = new URL(name).hostname
              const isNr = (entryDomain.includes('newrelic.com') || entryDomain.includes('nr-data.net') || entryDomain.includes('nr-local.net'))
              /** decide if we should ignore nr-specific assets */
              if (this.agentRef.init.performance.resources.ignore_newrelic && isNr) return
              /** decide if we should ignore the asset type (empty means allow everything, which is the default) */
              if (this.agentRef.init.performance.resources.asset_types.length && !this.agentRef.init.performance.resources.asset_types.includes(entryObject.initiatorType)) return
              /** decide if the entryDomain is a first party domain */
              firstParty = entryDomain === globalScope?.location.hostname || agentRef.init.performance.resources.first_party_domains.includes(entryDomain)
              if (firstParty) this.reportSupportabilityMetric('Generic/Performance/FirstPartyResource/Seen')
              if (isNr) this.reportSupportabilityMetric('Generic/Performance/NrResource/Seen')
            } catch (err) {
            // couldnt parse the URL, so firstParty will just default to false
            }

            this.reportSupportabilityMetric('Generic/Performance/Resource/Seen')
            const event = {
              ...entryObject,
              eventType: 'BrowserPerformance',
              timestamp: Math.floor(agentRef.runtime.timeKeeper.correctRelativeTimestamp(entryObject.startTime)),
              entryName: name,
              entryDuration: duration,
              firstParty
            }

            this.addEvent(event)
          } catch (err) {
            this.ee.emit('internal-error', [err, 'GenericEvents-Resource'])
          }
        }, this.featureName, this.ee)
      }

      agentRef.runtime.harvester.triggerHarvestFor(this)
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

    const addedEvent = this.events.add(eventAttributes)
    if (!addedEvent && !this.events.isEmpty()) {
      /** could not add the event because it pushed the buffer over the limit
       * so we harvest early, and try to add it again now that the buffer is cleared
       * if it fails again, we do nothing
       */
      this.ee.emit(SUPPORTABILITY_METRIC_CHANNEL, ['GenericEvents/Harvest/Max/Seen'])
      this.agentRef.runtime.harvester.triggerHarvestFor(this)
      this.events.add(eventAttributes)
    }
  }

  serializer (eventBuffer) {
    return applyFnToProps({ ins: eventBuffer }, this.obfuscator.obfuscateString.bind(this.obfuscator), 'string')
  }

  queryStringsBuilder () {
    return { ua: this.agentRef.info.userAttributes, at: this.agentRef.info.atts }
  }

  toEpoch (timestamp) {
    return Math.floor(this.agentRef.runtime.timeKeeper.correctRelativeTimestamp(timestamp))
  }

  trackSupportabilityMetrics () {
    /** track usage SMs to improve these experimental features */
    const configPerfTag = 'Config/Performance/'
    if (this.agentRef.init.performance.capture_marks) this.reportSupportabilityMetric(configPerfTag + 'CaptureMarks/Enabled')
    if (this.agentRef.init.performance.capture_measures) this.reportSupportabilityMetric(configPerfTag + 'CaptureMeasures/Enabled')
    if (this.agentRef.init.performance.resources.enabled) this.reportSupportabilityMetric(configPerfTag + 'Resources/Enabled')
    if (this.agentRef.init.performance.resources.asset_types?.length !== 0) this.reportSupportabilityMetric(configPerfTag + 'Resources/AssetTypes/Changed')
    if (this.agentRef.init.performance.resources.first_party_domains?.length !== 0) this.reportSupportabilityMetric(configPerfTag + 'Resources/FirstPartyDomains/Changed')
    if (this.agentRef.init.performance.resources.ignore_newrelic === false) this.reportSupportabilityMetric(configPerfTag + 'Resources/IgnoreNewrelic/Changed')
  }
}
