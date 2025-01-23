/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { bufferLog } from '../shared/utils'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, FEATURE_NAME, auto)

    const instanceEE = this.ee
    /** emitted by wrap-logger function */
    this.ee.on('wrap-logger-end', function handleLog ([message]) {
      const { level, customAttributes } = this
      bufferLog(instanceEE, message, customAttributes, level)
    })
    this.importAggregator(agentRef)
  }
}

export const Logging = Instrument
