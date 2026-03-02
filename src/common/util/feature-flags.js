/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { dispatchGlobalEvent } from '../dispatch/global-event'

/**
 * Sets the activatedFeatures on the agentRef, dispatches the global loaded event,
 * and emits the rumresp flag to features
 * @param {{[key:string]:number}} flags key-val pair of flag names and numeric
 * @param {Object} agentRef agent reference
 * @returns {void}
 */
export function activateFeatures (flags, agentRef) {
  if (!flags || typeof flags !== 'object' || !!agentRef.utils.activatedFeatures) return
  agentRef.ee.emit('rumresp', [flags])
  agentRef.utils.activatedFeatures = flags

  // let any window level subscribers know that the agent is running, per install docs
  dispatchGlobalEvent({
    loaded: true,
    drained: true,
    type: 'lifecycle',
    name: 'load',
    feature: undefined,
    data: flags
  })
}
