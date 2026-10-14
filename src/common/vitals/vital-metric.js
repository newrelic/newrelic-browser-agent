/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { now } from '../timing/now'

export class VitalMetric {
  #subscribers = new Set()
  history = []

  constructor (name, roundingMethod) {
    this.name = name
    this.attrs = {}
    this.roundingMethod = typeof roundingMethod === 'function' ? roundingMethod : Math.floor
  }

  /**
   * Records a new value for this metric and notifies subscribers.
   * @param {object} params
   * @param {number} params.value The metric's value. For most metrics this is itself a ms offset from page origin
   * (i.e. the metric's own real time of occurrence); for score-based metrics like CLS it isn't a time at all.
   * @param {object} [params.attrs] Metric-specific attribution attrs.
   */
  update ({ value, attrs = {} }) {
    if (value === undefined || value === null || value < 0) return
    const state = {
      value: this.roundingMethod(value),
      name: this.name,
      // optional web-vitals attribution fields are omitted rather than being serialized as null attributes
      attrs: Object.fromEntries(Object.entries(attrs).filter(([, attrValue]) => attrValue !== undefined)),
      /* Captured here, at the moment the underlying observation actually happens, rather than whenever a
      (possibly buffered/late) subscriber reads `.current` later. Needed by consumers whose `value` isn't itself
      a time offset (e.g. CLS's unitless score) and who therefore can't derive an accurate timestamp from `value` alone. */
      observedAt: now()
    }

    this.history.push(state)
    this.#subscribers.forEach(cb => {
      try {
        cb(state)
      } catch (e) {
        // ignore errors
      }
    })
  }

  get current () {
    return this.history[this.history.length - 1] || {
      value: undefined,
      name: this.name,
      attrs: {}
    }
  }

  get isValid () {
    return this.current.value >= 0
  }

  subscribe (callback, buffered = true) {
    if (typeof callback !== 'function') return
    this.#subscribers.add(callback)
    // emit full history on subscription ("buffered" behavior)
    if (this.isValid && !!buffered) this.history.forEach(state => { callback(state) })
    return () => { this.#subscribers.delete(callback) }
  }
}
