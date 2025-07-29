/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { generateSelectorPath } from '../../../../common/dom/selector-path'
import { FRUSTRATION_TIMEOUT_MS, OBSERVED_WINDOW_EVENTS } from '../../constants'
import { AggregatedUserAction } from './aggregated-user-action'
import { Timer } from '../../../../common/timer/timer'

export class UserActionsAggregator {
  /** @type {AggregatedUserAction=} */
  #aggregationEvent = undefined
  #aggregationKey = ''
  #deadClickTimer = undefined
  #domObserver = {
    running: false,
    instance: undefined
  }

  constructor () {
    if (MutationObserver) {
      this.#domObserver.instance = new MutationObserver(() => {
        this.#deadClickTimer?.clear()
      })
    }
  }

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
   * @returns {AggregatedUserAction|undefined} The previous aggregation set if it has been completed by processing the current event
   */
  process (evt, targetFields) {
    if (!evt) return
    const { selectorPath, nearestTargetFields } = getSelectorPath(evt, targetFields)
    const aggregationKey = getAggregationKey(evt, selectorPath)
    if (!!aggregationKey && aggregationKey === this.#aggregationKey) {
      // an aggregation exists already, so lets just continue to increment
      this.#aggregationEvent.aggregate(evt)
    } else {
      // return the prev existing one (if there is one)
      const finishedEvent = this.#aggregationEvent
      this.#deadClickCleanup()

      // then start new event aggregation
      this.#aggregationKey = aggregationKey
      this.#aggregationEvent = new AggregatedUserAction(evt, selectorPath, nearestTargetFields)
      if (evt.type === 'click') {
        this.#deadClickSetup(this.#aggregationEvent)
      }
      return finishedEvent
    }
  }

  #deadClickSetup (userAction) {
    if (this.#startObserver()) {
      this.#deadClickTimer = new Timer({
        onEnd: () => {
          userAction.deadClick = true
          this.#deadClickCleanup()
        }
      }, FRUSTRATION_TIMEOUT_MS)
    }
  }

  #deadClickCleanup () {
    this.#domObserver.instance?.disconnect()
    this.#domObserver.running = false
    this.#deadClickTimer?.clear()
  }

  #startObserver () {
    if (!this.#domObserver.running && this.#domObserver.instance) {
      this.#domObserver.running = true
      this.#domObserver.instance.observe(document, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true
      })
      return true
    }
  }
}

/**
 * Generates a selector path for the event, starting with simple cases like window or document and getting more complex for dom-tree traversals as needed.
 * Will return a random selector path value if no other path can be determined, to force the aggregator to skip aggregation for this event.
 * @param {Event} evt
 * @returns {string}
 */
function getSelectorPath (evt, targetFields) {
  let selectorPath; let nearestTargetFields = {}
  if (OBSERVED_WINDOW_EVENTS.includes(evt.type) || evt.target === window) selectorPath = 'window'
  else if (evt.target === document) selectorPath = 'document'
  // if still no selectorPath, generate one from target tree that includes elem ids
  else {
    const { path, nearestFields } = generateSelectorPath(evt.target, targetFields)
    selectorPath = path
    nearestTargetFields = nearestFields
  }
  // if STILL no selectorPath, it will return undefined which will skip aggregation for this event
  return { selectorPath, nearestTargetFields }
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
