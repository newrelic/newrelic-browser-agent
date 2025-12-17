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
import { setupRegisterAPI } from '../../../loaders/api/register'
import { isNative } from '../../../common/util/monkey-patched'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    /** feature specific APIs */
    setupLogAPI(agentRef)
    setupWrapLoggerAPI(agentRef)
    setupRegisterAPI(agentRef)

    const instanceEE = this.ee
    const globals = ['log', 'error', 'warn', 'info', 'debug', 'trace']

    globals.forEach((method) => {
      isNative(globalScope.console[method])
      wrapLogger(instanceEE, globalScope.console, method, { level: method === 'log' ? 'info' : method })
    })

    /** emitted by wrap-logger function */
    this.ee.on('wrap-logger-end', function handleLog ([message]) {
      const { level, customAttributes, autoCaptured } = this
      bufferLog(instanceEE, message, customAttributes, level, autoCaptured)
    })
    this.importAggregator(agentRef, () => import(/* webpackChunkName: "logging-aggregate" */ '../aggregate'))
  }
}

export const Logging = Instrument
