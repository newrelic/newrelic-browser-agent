/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAME } from '../constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { handle } from '../../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../../../loaders/features/features'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.waitForFlags(['ins']).then(([enabled]) => {
      if (enabled) {
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
            handle('generic-event', [obj], undefined, FEATURE_NAMES.genericEvent, this.ee)
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
