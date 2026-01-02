/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export class VitalMetric {
  #subscribers = new Set()
  history = []

  constructor (name, roundingMethod) {
    this.name = name
    this.attrs = {}
    this.roundingMethod = typeof roundingMethod === 'function' ? roundingMethod : Math.floor
  }

  update ({ value, attrs = {} }) {
    if (value === undefined || value === null || value < 0) return
    const state = {
      value: this.roundingMethod(value),
      name: this.name,
      attrs
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
