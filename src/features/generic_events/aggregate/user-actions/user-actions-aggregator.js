import { generateSelectorPath } from '../../../../common/dom/selector-path'
import { OBSERVED_WINDOW_EVENTS } from '../../constants'
import { UserAction } from './user-action'

export class UserActionsAggregator {
  /** @type {UserAction=} */
  #aggregationEvent = undefined
  #aggregationKey = ''
  #storeInFeature = () => {}

  /**
   * @param {Function} storeMethod The function given by the parent class to call when an event is done aggregating
   */
  constructor (storeMethod) {
    this.#storeInFeature = storeMethod
  }

  /**
   * Process the event and determine if a new aggregation set should be made or if it should increment the current aggregation
   * @param {Event} evt The event supplied by the addEventListener callback
   */
  process (evt) {
    const selectorPath = getSelectorPath(evt)
    const aggregationKey = getAggregationKey(evt, selectorPath)
    if (aggregationKey === this.#aggregationKey) {
      // an aggregation exists already, so lets just continue to increment
      this.#aggregationEvent.aggregate(evt)
    } else {
      // store the prev existing one (if there is one)
      this.storeCurrentUserActionInFeature()
      // then set as this new event aggregation
      this.#aggregationKey = aggregationKey
      this.#aggregationEvent = new UserAction(evt, selectorPath)
    }
  }

  /**
   * Store the current aggregation set in the parent feature's event buffer and clear the state of the aggregator
   */
  storeCurrentUserActionInFeature () {
    // store the prev existing one (if there is one)
    if (this.#aggregationEvent) {
      this.#storeInFeature(this.#aggregationEvent)
      // then clear it...
      this.#aggregationKey = ''
      this.#aggregationEvent = undefined
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
  if (OBSERVED_WINDOW_EVENTS.includes(evt.type) || evt.target === evt.target.top) selectorPath = 'window'
  if (evt.target === document) selectorPath = 'document'
  // if still no selectorPath, generate one from target tree that includes elem ids
  selectorPath ??= generateSelectorPath(evt.target, { includeId: true, includeClass: false })
  // if finally still no selectorPath, assign a random val,
  // since we don't want to aggregate at all if we dont know what the target is
  selectorPath ??= '' + Math.random()
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
