/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAME } from '../constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { genericEventHandler } from '../../../common/generic-events/generic-event-handler'
import { offset } from '../../../common/constants/runtime'
import { GenericEvent } from '../../../common/generic-events/generic-event'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.waitForFlags(['ins']).then(([enabled]) => {
      if (enabled) {
        const handlePerformanceObject = (list, observer) => {
          list.getEntries().forEach(({ detail, duration, entryType, name, startTime }) => {
            const event = new GenericEvent({
              eventType: 'BrowserPerformance' + entryType.split('')[0].toUpperCase() + entryType.substr(1),
              timestamp: startTime + offset,
              timestampOffset: startTime,
              detail,
              duration,
              entryType,
              name,
              startTime
            })
            genericEventHandler.addEvent(event, this)
          })
        }
        this.observer = new PerformanceObserver(handlePerformanceObject)
        this.observer.observe({ type: 'mark', buffered: true })
        this.observer.observe({ type: 'measure', buffered: true })
      }
    })

    this.drain()
  }
}
