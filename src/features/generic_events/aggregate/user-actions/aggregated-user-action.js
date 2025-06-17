/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { RAGE_CLICK_THRESHOLD_EVENTS, RAGE_CLICK_THRESHOLD_MS } from '../../constants'
import { cleanURL } from '../../../../common/url/clean-url'
import { isVisible } from './utils'

export class AggregatedUserAction {
  constructor (evt, selectorInfo) {
    this.event = evt
    this.count = 1
    this.originMs = Math.floor(evt.timeStamp)
    this.relativeMs = [0]
    this.selectorPath = selectorInfo.selectorPath
    this.rageClick = undefined
    this.nearestTargetFields = selectorInfo.nearestTargetFields
    this.currentUrl = cleanURL('' + location)
    this.hasActLink = selectorInfo.hasActLink
    this.deadClick = this.isDeadClick()
  }

  /**
   * Aggregates the count and maintains the relative MS array for matching events
   * Will determine if a rage click was observed as part of the aggregation
   * @param {Event} evt
   * @returns {void}
   */
  aggregate (evt) {
    this.count++
    this.relativeMs.push(Math.floor(evt.timeStamp - this.originMs))
    if (this.isRageClick()) this.rageClick = true
  }

  /**
   * Determines if the current set of relative ms values constitutes a rage click
   * @returns {boolean}
   */
  isRageClick () {
    const len = this.relativeMs.length
    return (this.event.type === 'click' && len >= RAGE_CLICK_THRESHOLD_EVENTS && this.relativeMs[len - 1] - this.relativeMs[len - RAGE_CLICK_THRESHOLD_EVENTS] < RAGE_CLICK_THRESHOLD_MS)
  }

  /**
   * Determines if the click is a dead click, which is defined as a click on an element that is not interactive.
   * @returns {boolean}
   */
  isDeadClick () {
    return this.event.type === 'click' && (this.hasActLink === false ||
      (this.event.target && this.event.target.nodeType === Node.ELEMENT_NODE && isVisible(this.event.target) &&
        this.event.target.tagName === 'INPUT' && this.event.target.type === 'text' && this.event.target.readOnly))
  }
}
