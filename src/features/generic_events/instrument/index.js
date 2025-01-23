/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { debounce } from '../../../common/util/invoke'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, OBSERVED_EVENTS, OBSERVED_WINDOW_EVENTS } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, FEATURE_NAME, auto)
    /** config values that gate whether the generic events aggregator should be imported at all */
    const genericEventSourceConfigs = [
      agentRef.init.page_action.enabled,
      agentRef.init.performance.capture_marks,
      agentRef.init.performance.capture_measures,
      agentRef.init.user_actions.enabled,
      agentRef.init.performance.resources.enabled
    ]

    if (isBrowserScope) {
      if (agentRef.init.user_actions.enabled) {
        OBSERVED_EVENTS.forEach(eventType =>
          windowAddEventListener(eventType, (evt) => handle('ua', [evt], undefined, this.featureName, this.ee), true)
        )
        OBSERVED_WINDOW_EVENTS.forEach(eventType => {
          const debounceHandler = debounce((evt) => { handle('ua', [evt], undefined, this.featureName, this.ee) }, 500, { leading: true })
          windowAddEventListener(eventType, debounceHandler)
        }
        // Capture is not used here so that we don't get element focus/blur events, only the window's as they do not bubble. They are also not cancellable, so no worries about being front of line.
        )
      }
      if (agentRef.init.performance.resources.enabled && globalScope.PerformanceObserver?.supportedEntryTypes.includes('resource')) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            handle('browserPerformance.resource', [entry], undefined, this.featureName, this.ee)
          })
        })
        observer.observe({ type: 'resource', buffered: true })
      }
    }

    /** If any of the sources are active, import the aggregator. otherwise deregister */
    if (genericEventSourceConfigs.some(x => x)) this.importAggregator(agentRef)
    else this.deregisterDrain()
  }
}

export const GenericEvents = Instrument
