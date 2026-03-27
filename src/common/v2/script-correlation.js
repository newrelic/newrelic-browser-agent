/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Represents script correlation data combining DOM and Performance API information
 */
export class ScriptCorrelation {
  /** @type {CorrelationTiming} [dom] - DOM-related information */
  dom = new CorrelationTiming()
  /** @type {CorrelationTiming} [performance] - Performance-related information */
  performance = new CorrelationTiming()

  /**
   * Creates a new ScriptCorrelation instance
   * @param {string} url - The cleaned URL of the script
   */
  constructor (url) {
    /** @type {string} The cleaned URL of the script */
    this.url = url
  }

  /**
   * Gets the script timing, using DOM timings if available, otherwise falling back to performance timings or registeredAt as appropriate. This is used to provide the most accurate script timing possible for registered entities.
   * @returns {{start: number, end: number}
   */
  get script () {
    return {
      start: Math.max(this.dom.start, this.performance.end),
      end: Math.max(this.dom.end, this.performance.end)
    }
  }
}

class CorrelationTiming {
  /** @type {number} [start] - The startTime from the performance entry */
  start = 0
  /** @type {number} [end] - The responseEnd from the performance entry */
  end = 0
  /** @type {*} [value] - The entry value */
  value = undefined
}
