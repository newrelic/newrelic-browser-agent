/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// import { handle } from '../../../common/event-emitter/handle'
// import { WEBSOCKET_TAG, wrapWebSocket } from '../../../common/wrap/wrap-websocket'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME/*, WATCHABLE_WEB_SOCKET_EVENTS */ } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, FEATURE_NAME, auto)
    // wrapWebSocket(this.ee)

    // WATCHABLE_WEB_SOCKET_EVENTS.forEach((suffix) => {
    //   this.ee.on(WEBSOCKET_TAG + suffix, (...args) => {
    //     handle('buffered-' + WEBSOCKET_TAG + suffix, [...args], undefined, this.featureName, this.ee)
    //   })
    // })

    this.importAggregator(agentRef)
  }
}

export const Metrics = Instrument
