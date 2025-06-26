/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { OBSERVED_WINDOW_EVENTS } from '../../constants'
import { AggregatedUserAction } from './aggregated-user-action'
import { analyzeElemPath } from './selector-path'

export class UserActionsAggregator {
  /** @type {AggregatedUserAction=} */
  #aggregationEvent = undefined
  #aggregationKey = ''

  get aggregationEvent () {
    // if this is accessed externally, we need to be done aggregating on it
    // to prevent potential mutability and duplication issues, so the state is cleared upon returning.
    // This value may need to be accessed during an unload harvest.
    const finishedEvent = this.#aggregationEvent
    this.#aggregationKey = ''
    this.#aggregationEvent = undefined
    return finishedEvent
  }

  /**
   * Process the event and determine if a new aggregation set should be made or if it should increment the current aggregation
   * @param {Event} evt The event supplied by the addEventListener callback
   * @param {Array<string>} [targetFields=[]] specifies which fields to gather from the nearest element in the path
   * @returns {AggregatedUserAction|undefined} The previous aggregation set if it has been completed by processing the current event
   */
  process (evt, targetFields) {
    if (!evt) return
    const selectorInfo = gatherSelectorPathInfo(evt, targetFields)
    const aggregationKey = getAggregationKey(evt, selectorInfo.path)
    if (!!aggregationKey && aggregationKey === this.#aggregationKey) {
      // an aggregation exists already, so lets just continue to increment
      this.#aggregationEvent.aggregate(evt, selectorInfo)
    } else {
      // return the prev existing one (if there is one)
      const finishedEvent = this.#aggregationEvent
      // then set as this new event aggregation
      this.#aggregationKey = aggregationKey
      this.#aggregationEvent = new AggregatedUserAction(evt, selectorInfo)
      return finishedEvent
    }
  }
}

/**
 * Given an event, generates a CSS selector path along with other metadata info about the path.
 *
 * Starts with simple cases like window or document and progresses to more complex dom-tree traversals as needed.
 * Will return selectorPath: undefined if no other path can be determined, to force the aggregator to skip aggregation for this event.
 * @param {Event} evt
 * @param {Array<string>} [targetFields=[]] specifies which fields to gather from the nearest element in the path
 * @returns {{ path: (undefined|string), nearestFields: {}, hasInteractiveElems: boolean, hasLink: boolean, hasTextbox: boolean }}
 */
function gatherSelectorPathInfo (evt, targetFields) {
  const result = { path: undefined, nearestFields: {}, hasInteractiveElems: false, hasLink: false, hasTextbox: false }
  if (OBSERVED_WINDOW_EVENTS.includes(evt.type) || evt.target === window) return { ...result, path: 'window' }
  if (evt.target === document) return { ...result, path: 'document' }

  // Note: if selectorPath is undefined, aggregation will be skipped for this event
  return analyzeElemPath(evt.target, targetFields)
}

/**
 * Returns an aggregation key based on the event type and the selector path of the event's target.
 * Scrollend events are aggregated into one set, no matter what.
 * @param {Event} evt
 * @param {string} selectorPath
 * @returns {string}
 */
function getAggregationKey (evt, selectorPath) {
  let aggregationKey = evt.type
  /** aggregate all scrollends into one set (if sequential), no matter what their target is
   * the aggregation group's selector path with be reflected as the first one observed
   * due to the way the aggregation logic works (by storing the initial value and aggregating it) */
  if (evt.type !== 'scrollend') aggregationKey += '-' + selectorPath
  return aggregationKey
}
