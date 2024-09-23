import { generateSelectorPath } from '../../../common/dom/selector-path'
import { OBSERVED_WINDOW_EVENTS, RAGE_CLICK_THRESHOLD_EVENTS, RAGE_CLICK_THRESHOLD_MS } from '../constants'

export class UserActionsAggregator {
  #currentUserAction = {}

  constructor (storeMethod) {
    this.storeInFeature = storeMethod
  }

  process (evt) {
    const selectorPath = getSelectorPath(evt)
    const aggregationKey = getAggregationKey(evt, selectorPath)
    if (this.#currentUserAction[aggregationKey]) {
      // an aggregation exists already, so lets just continue to increment
      const relMs = this.#currentUserAction[aggregationKey].relativeMs
      this.#currentUserAction[aggregationKey].count++
      relMs.push(Math.floor(evt.timeStamp - this.#currentUserAction[aggregationKey].originMs))
      // detect rage click
      const len = relMs.length
      /** if there are 4 relative timestamps within 1000ms, its a "rage click". We check every event if the previous 4 meet this condition */
      if (this.#currentUserAction[aggregationKey].event.type === 'click' && len >= RAGE_CLICK_THRESHOLD_EVENTS && relMs[len - 1] - relMs[len - RAGE_CLICK_THRESHOLD_EVENTS] < RAGE_CLICK_THRESHOLD_MS) {
        this.#currentUserAction[aggregationKey].rageClick = true
      }
    } else {
      // store the prev existing one (if there is one)
      this.storeCurrentUserActionInFeature()
      // then set as this new event aggregation
      this.#currentUserAction[aggregationKey] = {
        event: evt,
        count: 1,
        originMs: Math.floor(evt.timeStamp),
        relativeMs: [0],
        selectorPath,
        rageClick: undefined
      }
    }
  }

  storeCurrentUserActionInFeature () {
    // store the prev existing one (if there is one)
    const [[prevKey, prevVal] = []] = Object.entries(this.#currentUserAction)
    if (prevVal) {
      this.storeInFeature(prevVal)
      // then clear it...
      delete this.#currentUserAction[prevKey]
    }
  }
}

function getSelectorPath (evt) {
  let selectorPath
  if (OBSERVED_WINDOW_EVENTS.includes(evt.type) || evt.target === evt.target.top) selectorPath = 'window'
  if (evt.target === document) selectorPath = 'document'
  // if still no selectorPath, generate one from target tree
  selectorPath ??= generateSelectorPath(evt.target)
  // if finally still no selectorPath, assign a random val,
  // since we don't want to aggregate at all if we dont know what the target is
  selectorPath ??= Math.random()
  return selectorPath
}

function getAggregationKey (evt, selectorPath) {
  let aggregationKey = evt.type
  /** aggregate all scrollends, no matter what their target is */
  if (evt.type !== 'scrollend') aggregationKey += '-' + selectorPath
  return aggregationKey
}
