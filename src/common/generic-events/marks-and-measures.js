/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { offset } from '../constants/runtime'
import { EventMessenger } from './event-messenger'

class MarksAndMeasures extends EventMessenger {
  #initialized = false

  subscribe (...args) {
    if (!this.#initialized) this.initialize()
    super.subscribe(...args)
  }

  initialize () {
    this.#initialized = true
    const handlePerformanceObject = (list, observer) => {
      list.getEntries().forEach(({ detail, duration, entryType, name, startTime }) => {
        const obj = {
          eventType: 'BrowserPerformance' + entryType.split('')[0].toUpperCase() + entryType.substr(1),
          timestamp: Math.floor(offset + startTime),
          detail,
          duration,
          entryType,
          name,
          startTime
        }
        this.emit({ value: obj })
      })
    }
    const observer = new PerformanceObserver(handlePerformanceObject)
    observer.observe({ type: 'mark', buffered: true })
    observer.observe({ type: 'measure', buffered: true })
  }
}

export const marksAndMeasures = new MarksAndMeasures()
