/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventMessenger } from './event-messenger'

export const marksAndMeasures = new EventMessenger()

const handlePerformanceObject = (list, observer) => {
  list.getEntries().forEach(({ detail, duration, entryType, name, startTime }) => {
    const obj = {
      eventType: 'BrowserPerformance' + entryType.split('')[0].toUpperCase() + entryType.substr(1),
      timestamp: startTime,
      detail,
      duration,
      entryType,
      name,
      startTime
    }
    marksAndMeasures.emit({ value: obj })
  })
}
const observer = new PerformanceObserver(handlePerformanceObject)
observer.observe({ type: 'mark', buffered: true })
observer.observe({ type: 'measure', buffered: true })
