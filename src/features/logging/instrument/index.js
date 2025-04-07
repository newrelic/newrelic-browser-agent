/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { bufferLog } from '../shared/utils'
import { wrapLogger } from '../../../common/wrap/wrap-logger'
import { globalScope } from '../../../common/constants/runtime'
import { setupLogAPI } from '../../../loaders/api/log'
import { setupWrapLoggerAPI } from '../../../loaders/api/wrapLogger'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, FEATURE_NAME, auto)

    /** feature specific APIs */
    setupLogAPI(agentRef)
    setupWrapLoggerAPI(agentRef)

    const instanceEE = this.ee
    wrapLogger(instanceEE, globalScope.console, 'log', { level: 'info' })
    wrapLogger(instanceEE, globalScope.console, 'error', { level: 'error' })
    wrapLogger(instanceEE, globalScope.console, 'warn', { level: 'warn' })
    wrapLogger(instanceEE, globalScope.console, 'info', { level: 'info' })
    wrapLogger(instanceEE, globalScope.console, 'debug', { level: 'debug' })
    wrapLogger(instanceEE, globalScope.console, 'trace', { level: 'trace' })
    /** emitted by wrap-logger function */
    this.ee.on('wrap-logger-end', function handleLog ([message]) {
      const { level, customAttributes } = this
      bufferLog(instanceEE, message, customAttributes, level)
    })
    this.importAggregator(agentRef)
  }
}

export const Logging = Instrument
