/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getRuntime } from '../../../common/config/config'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor(agentIdentifier, aggregator, auto=true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    const agentRuntime = getRuntime(this.agentIdentifier)
    // Turn on feature
    agentRuntime.features.ins = true
    
    this.importAggregator()
  }
}
