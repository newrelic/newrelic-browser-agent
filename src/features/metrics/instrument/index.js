/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { isBrowserScope } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { InstrumentBase } from '../../utils/instrument-base'
import {
  FEATURE_NAME,
  // WATCHABLE_WEB_SOCKET_EVENTS,
  SUPPORTABILITY_METRIC_CHANNEL
} from '../constants'
// import { handle } from '../../../common/event-emitter/handle'
// import { WEBSOCKET_TAG, wrapWebSocket } from '../../../common/wrap/wrap-websocket'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, FEATURE_NAME, auto)
    // wrapWebSocket(this.ee) - feb'25 : removing wrapping again to avoid integration issues

    // WATCHABLE_WEB_SOCKET_EVENTS.forEach((suffix) => {
    //   this.ee.on(WEBSOCKET_TAG + suffix, (...args) => {
    //     handle('buffered-' + WEBSOCKET_TAG + suffix, [...args], undefined, this.featureName, this.ee)
    //   })
    // })

    if (isBrowserScope) {
      document.addEventListener('securitypolicyviolation', (e) => {
        handle(SUPPORTABILITY_METRIC_CHANNEL, ['Generic/CSPViolation/Detected'], undefined, this.featureName, this.ee)
      })
    }

    this.importAggregator(agentRef, import(/* webpackChunkName: "metrics-aggregate" */ '../aggregate'))
  }
}

export const Metrics = Instrument
