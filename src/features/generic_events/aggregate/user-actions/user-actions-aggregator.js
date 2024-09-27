import { generateSelectorPath } from '../../../../common/dom/selector-path'
import { OBSERVED_WINDOW_EVENTS } from '../../constants'
import { AggregatedUserAction } from './aggregated-user-action'

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
   * @returns {AggregatedUserAction|undefined} The previous aggregation set if it has been completed by processing the current event
   */
  process (evt) {
    if (!evt) return
    const selectorPath = getSelectorPath(evt)
    const aggregationKey = getAggregationKey(evt, selectorPath)
    if (!!aggregationKey && aggregationKey === this.#aggregationKey) {
      // an aggregation exists already, so lets just continue to increment
      this.#aggregationEvent.aggregate(evt)
    } else {
      // return the prev existing one (if there is one)
      const finishedEvent = this.#aggregationEvent
      // then set as this new event aggregation
      this.#aggregationKey = aggregationKey
      this.#aggregationEvent = new AggregatedUserAction(evt, selectorPath)
      return finishedEvent
    }
  }
}

/**
 * Generates a selector path for the event, starting with simple cases like window or document and getting more complex for dom-tree traversals as needed.
 * Will return a random selector path value if no other path can be determined, to force the aggregator to skip aggregation for this event.
 * @param {Event} evt
 * @returns {string}
 */
function getSelectorPath (evt) {
  let selectorPath
  if (OBSERVED_WINDOW_EVENTS.includes(evt.type) || evt.target === window) selectorPath = 'window'
  else if (evt.target === document) selectorPath = 'document'
  // if still no selectorPath, generate one from target tree that includes elem ids
  else selectorPath = generateSelectorPath(evt.target)
  // if STILL no selectorPath, it will return undefined which will skip aggregation for this event
  return selectorPath
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
