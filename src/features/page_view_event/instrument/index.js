/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { setupSetPageViewNameAPI } from '../../../loaders/api/setPageViewName'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, CONSTANTS.FEATURE_NAME, auto)

    /** feature specific APIs */
    setupSetPageViewNameAPI(agentRef)

    /** messages from the register API that can trigger a new RUM call */
    this.ee.on('api-send-rum', (attrs, target) => handle('send-rum', [attrs, target], undefined, this.featureName, this.ee))

    this.importAggregator(agentRef)
  }
}

export const PageViewEvent = Instrument
