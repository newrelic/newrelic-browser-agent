/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerHandler as register } from '../../../common/event-emitter/register-handler'
import { FEATURE_NAME } from '../constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { getRuntime } from '../../../common/config/config'
import { genericEventHandler } from '../../../common/generic-events/generic-event-handler'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    register('api-addPageAction', (...args) => this.addPageAction(...args), this.featureName, this.ee)

    this.waitForFlags(['ins']).then(([enabled]) => {
      if (!enabled) {
        this.blocked = true
      }
    })

    this.drain()
  }

  // WARNING: Insights times are in seconds. EXCEPT timestamp, which is in ms.
  addPageAction (t, name = '', attributes = {}) {
    if (this.blocked) return

    const eventAttributes = {
      ...attributes,
      eventType: 'PageAction',
      timestamp: t + getRuntime(this.agentIdentifier).offset,
      timestampOffset: t,
      timeSinceLoad: t / 1000,
      actionName: name,
      browserWidth: window?.document?.documentElement?.clientWidth,
      browserHeight: window?.document?.documentElement?.clientHeight
    }

    // handle('generic-event', [eventAttributes], undefined, FEATURE_NAMES.genericEvent, this.ee)
    // send to generic event handler
    genericEventHandler.addEvent(eventAttributes, this)
  }
}
