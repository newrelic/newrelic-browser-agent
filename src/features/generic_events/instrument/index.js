/* Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { isBrowserScope } from '../../../common/constants/runtime'
import { deregisterDrain } from '../../../common/drain/drain'
import { handle } from '../../../common/event-emitter/handle'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, OBSERVED_EVENTS, OBSERVED_WINDOW_EVENTS } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, FEATURE_NAME, auto)
    const genericEventSourceConfigs = [
      agentRef.init.page_action.enabled,
      agentRef.init.user_actions.enabled
      // other future generic event source configs to go here, like M&Ms, PageResouce, etc.
    ]

    if (isBrowserScope && agentRef.init.user_actions.enabled) {
      OBSERVED_EVENTS.forEach(eventType =>
        windowAddEventListener(eventType, (evt) => handle('ua', [evt], undefined, this.featureName, this.ee), true)
      )
      OBSERVED_WINDOW_EVENTS.forEach(eventType =>
        windowAddEventListener(eventType, (evt) => handle('ua', [evt], undefined, this.featureName, this.ee))
        // Capture is not used here so that we don't get element focus/blur events, only the window's as they do not bubble. They are also not cancellable, so no worries about being front of line.
      )
    }

    /** If any of the sources are active, import the aggregator. otherwise deregister */
    if (genericEventSourceConfigs.some(x => x)) this.importAggregator(agentRef)
    else deregisterDrain(agentRef.agentIdentifier, this.featureName)
  }
}

export const GenericEvents = Instrument
