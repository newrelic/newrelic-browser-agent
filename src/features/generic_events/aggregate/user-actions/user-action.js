import { RAGE_CLICK_THRESHOLD_EVENTS, RAGE_CLICK_THRESHOLD_MS } from '../../constants'

export class UserAction {
  constructor (evt, selectorPath) {
    this.event = evt
    this.count = 1
    this.originMs = Math.floor(evt.timeStamp)
    this.relativeMs = [0]
    this.selectorPath = selectorPath
    this.rageClick = undefined
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
}
