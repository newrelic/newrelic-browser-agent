/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'
import { mapOwn } from '../../../common/util/map-own'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { handle } from '../../../common/event-emitter/handle'
import { getInfo, getConfigurationValue } from '../../../common/config/config'
import { FEATURE_NAME } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { AggregateBase } from '../../utils/aggregate-base'
import { cumulativeLayoutShift } from '../../../common/vitals/cumulative-layout-shift'
import { firstContentfulPaint } from '../../../common/vitals/first-contentful-paint'
import { firstInputDelay } from '../../../common/vitals/first-input-delay'
import { firstPaint } from '../../../common/vitals/first-paint'
import { interactionToNextPaint } from '../../../common/vitals/interaction-to-next-paint'
import { largestContentfulPaint } from '../../../common/vitals/largest-contentful-paint'
import { timeToFirstByte } from '../../../common/vitals/time-to-first-byte'
import { longTask } from '../../../common/vitals/long-task'
// import { subscribeToVisibilityChange } from '../../../common/window/page-visibility'
import { VITAL_NAMES } from '../../../common/vitals/constants'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME

  #handleVitalMetric = ({ name, value, attrs }) => {
    this.addTiming(name, value, attrs)
  }

  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.timings = []
    this.timingsSent = []
    this.curSessEndRecorded = false

    if (getConfigurationValue(this.agentIdentifier, 'page_view_timing.long_task') === true) longTask.subscribe(this.#handleVitalMetric)

    /* It's important that CWV api, like "onLCP", is called before this scheduler is initialized. The reason is because they listen to the same
      on vis change or pagehide events, and we'd want ex. onLCP to record the timing (win the race) before we try to send "final harvest". */

    registerHandler('docHidden', msTimestamp => this.endCurrentSession(msTimestamp), this.featureName, this.ee)
    registerHandler('winPagehide', msTimestamp => this.recordPageUnload(msTimestamp), this.featureName, this.ee)

    const initialHarvestSeconds = getConfigurationValue(this.agentIdentifier, 'page_view_timing.initialHarvestSeconds') || 10
    const harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'page_view_timing.harvestTimeSeconds') || 30

    this.waitForFlags(([])).then(() => {
      firstPaint.subscribe(this.#handleVitalMetric)
      firstContentfulPaint.subscribe(this.#handleVitalMetric)
      firstInputDelay.subscribe(this.#handleVitalMetric)
      largestContentfulPaint.subscribe(this.#handleVitalMetric)
      interactionToNextPaint.subscribe(this.#handleVitalMetric)
      timeToFirstByte.subscribe(({ attrs }) => {
        this.addTiming('load', Math.round(attrs.navigationEntry.loadEventEnd))
      })
      // *cli Mar'24 - CLS node won't be added until we fix the rounding problem in schema that's grounding the decimal value to 0
      // subscribeToVisibilityChange(() => {
      //   const { name, value, attrs } = cumulativeLayoutShift.current
      //   if (value === undefined) return
      //   this.addTiming(name, value * 1000, attrs) // downstream consumer interprets the value as ms-unit and converts it to seconds; cls score is neither and we need to negate that division
      // }, true) // so CLS node only reports on vis change rather than on every change

      const scheduler = new HarvestScheduler('events', {
        onFinished: (...args) => this.onHarvestFinished(...args),
        getPayload: (...args) => this.prepareHarvest(...args)
      }, this)
      scheduler.startTimer(harvestTimeSeconds, initialHarvestSeconds)

      this.drain()
    })
  }

  /**
   * Add the time of _document visibilitychange to hidden_ to the next PVT harvest == NRDB pageHide attr.
   * @param {number} timestamp
   */
  endCurrentSession (timestamp) {
    if (!this.curSessEndRecorded) { // TO DO: stage 2 - we don't want to capture this timing twice on page navigating away, but it should run again if we return to page and away *again*
      this.addTiming('pageHide', timestamp, null)
      this.curSessEndRecorded = true
    }
  }

  /**
   * Add the time of _window pagehide event_ firing to the next PVT harvest == NRDB windowUnload attr.
   */
  recordPageUnload (timestamp) {
    this.addTiming('unload', timestamp, null)
    /*
    Issue: Because window's pageHide commonly fires BEFORE vis change and "final" harvest would happen at the former in this case, we also have to add our vis-change event now or it may not be sent.
    Affected: Safari < v14.1/.5 ; versions that don't support 'visiilitychange' event
    Impact: For affected w/o this, NR 'pageHide' attribute may not be sent. For other browsers w/o this, NR 'pageHide' gets fragmented into its own harvest call on page unloading because of dual EoL logic.
    Mitigation: NR 'unload' and 'pageHide' are both recorded when window pageHide fires, rather than only recording 'unload'.
    Future: When EoL can become the singular subscribeToVisibilityChange, it's likely endCurrentSession isn't needed here as 'unload'-'pageHide' can be untangled.
    */
    this.endCurrentSession(timestamp)
  }

  addTiming (name, value, attrs) {
    attrs = attrs || {}
    addConnectionAttributes(attrs) // network conditions may differ from the actual for VitalMetrics when they were captured

    // If cls was set to another value by `onCLS`, then it's supported and is attached onto any timing but is omitted until such time.
    /*
    *cli Apr'23 - Convert attach-to-all -> attach-if-not-null. See NEWRELIC-6143.
    Issue: Because NR 'pageHide' was only sent once with what is considered the "final" CLS value, in the case that 'pageHide' fires before 'load' happens, we incorrectly a final CLS of 0 for that page.
    Mitigation: We've set initial CLS to null so that it's omitted from timings like 'pageHide' in that edge case. It should only be included if onCLS callback was executed at least once.
    Future: onCLS value changes should be reported directly & CLS separated into its own timing node so it's not beholden to 'pageHide' firing. It'd also be possible to report the real final CLS.
    *cli Mar'24 update: CLS now emitted as its own timing node in addition to as-property under other nodes. The 'cls' property is unnecessary for cls nodes.
    */
    if (name !== VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT && cumulativeLayoutShift.current.value >= 0) {
      attrs.cls = cumulativeLayoutShift.current.value
    }

    this.timings.push({
      name,
      value,
      attrs
    })

    handle('pvtAdded', [name, value, attrs], undefined, FEATURE_NAMES.sessionTrace, this.ee)
  }

  onHarvestFinished (result) {
    if (result.retry && this.timingsSent.length > 0) {
      this.timings.unshift(...this.timingsSent)
      this.timingsSent = []
    }
  }

  appendGlobalCustomAttributes (timing) {
    var timingAttributes = timing.attrs || {}
    var customAttributes = getInfo(this.agentIdentifier).jsAttributes || {}

    var reservedAttributes = ['size', 'eid', 'cls', 'type', 'fid', 'elTag', 'elUrl', 'net-type',
      'net-etype', 'net-rtt', 'net-dlink']
    mapOwn(customAttributes, function (key, val) {
      if (reservedAttributes.indexOf(key) < 0) {
        timingAttributes[key] = val
      }
    })
  }

  // serialize and return current timing data, clear and save current data for retry
  prepareHarvest (options) {
    if (this.timings.length === 0) return

    var payload = this.getPayload(this.timings)
    if (options.retry) {
      for (var i = 0; i < this.timings.length; i++) {
        this.timingsSent.push(this.timings[i])
      }
    }
    this.timings = []
    return { body: { e: payload } }
  }

  // serialize array of timing data
  getPayload (data) {
    var addString = getAddStringContext(this.agentIdentifier)

    var payload = 'bel.6;'

    for (var i = 0; i < data.length; i++) {
      var timing = data[i]

      payload += 'e,'
      payload += addString(timing.name) + ','
      payload += nullable(timing.value, numeric, false) + ','

      this.appendGlobalCustomAttributes(timing)

      var attrParts = addCustomAttributes(timing.attrs, addString)
      if (attrParts && attrParts.length > 0) {
        payload += numeric(attrParts.length) + ';' + attrParts.join(';')
      }

      if ((i + 1) < data.length) payload += ';'
    }

    return payload
  }
}

function addConnectionAttributes (obj) {
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection // to date, both window & worker shares the same support for connection
  if (!connection) return

  if (connection.type) obj['net-type'] = connection.type
  if (connection.effectiveType) obj['net-etype'] = connection.effectiveType
  if (connection.rtt) obj['net-rtt'] = connection.rtt
  if (connection.downlink) obj['net-dlink'] = connection.downlink
}
