/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { handle } from '../../../common/event-emitter/handle'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { globalScope } from '../../../common/constants/runtime'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { castError, castErrorEvent, castPromiseRejectionEvent } from '../shared/cast-error'
import { setupNoticeErrorAPI } from '../../../loaders/api/noticeError'
import { setupSetErrorHandlerAPI } from '../../../loaders/api/setErrorHandler'
import { setupAddReleaseAPI } from '../../../loaders/api/addRelease'
import { setupRegisterAPI } from '../../../loaders/api/register'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME

  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    /** feature specific APIs */
    setupNoticeErrorAPI(agentRef)
    setupSetErrorHandlerAPI(agentRef)
    setupAddReleaseAPI(agentRef)
    setupRegisterAPI(agentRef)

    try {
      // this try-catch can be removed when IE11 is completely unsupported & gone
      this.removeOnAbort = new AbortController()
    } catch (e) {}

    this.ee.on('internal-error', (error, reason) => {
      if (!this.abortHandler) return
      handle('ierr', [castError(error), now(), true, {}, agentRef.runtime.isRecording, reason], undefined, this.featureName, this.ee)
    })

    globalScope.addEventListener('unhandledrejection', (promiseRejectionEvent) => {
      if (!this.abortHandler) return
      handle('err', [castPromiseRejectionEvent(promiseRejectionEvent), now(), false, { unhandledPromiseRejection: 1 }, agentRef.runtime.isRecording], undefined, this.featureName, this.ee)
    }, eventListenerOpts(false, this.removeOnAbort?.signal))

    globalScope.addEventListener('error', (errorEvent) => {
      if (!this.abortHandler) return
      handle('err', [castErrorEvent(errorEvent), now(), false, {}, agentRef.runtime.isRecording], undefined, this.featureName, this.ee)
    }, eventListenerOpts(false, this.removeOnAbort?.signal))

    globalScope.addEventListener('securitypolicyviolation', (violationEvent) => {
      if (!this.abortHandler) return
      handle('err', [castErrorEvent(violationEvent), now(), false, { cspViolation: 1 }, agentRef.runtime.isRecording], undefined, this.featureName, this.ee)
    })

    this.abortHandler = this.#abort // we also use this as a flag to denote that the feature is active or on and handling errors
    this.importAggregator(agentRef, () => import(/* webpackChunkName: "jserrors-aggregate" */ '../aggregate'))
  }

  /** Restoration and resource release tasks to be done if JS error loader is being aborted. Unwind changes to globals. */
  #abort () {
    this.removeOnAbort?.abort()
    this.abortHandler = undefined // weakly allow this abort op to run only once
  }
}

export const JSErrors = Instrument
