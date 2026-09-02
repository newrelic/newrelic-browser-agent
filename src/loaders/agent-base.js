/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable n/handle-callback-err */

import { generateRandomHexString } from '../common/ids/unique-id'
import { ApiBase } from './api-base'
import { globalScope } from '../common/constants/runtime'
import { GLOBAL_EVENT_NAMESPACE } from '../common/dispatch/global-event'
import { debugLog } from '../common/debug/instrument-prototype'

/**
 * @typedef {import('./api/interaction-types').InteractionInstance} InteractionInstance
 */

export class AgentBase extends ApiBase {
  agentIdentifier = generateRandomHexString(16)

  /**
   * Turns on console.debug logging for every feature currently registered on this agent
   * instance (instrument and, if already loaded, its aggregate) -- and, optionally, the
   * agent's global dispatch events. See FeatureBase#debug for the feature-level opts.
   * @param {Object} [opts]
   * @param {boolean} [opts.instrumentation=true]
   * @param {boolean} [opts.eventBuffer=true]
   * @param {boolean} [opts.eventEmitter=false] - applies once for the whole agent even though set per-feature-call underneath, since the emitter itself is shared
   * @param {boolean} [opts.listeners=false] - applies once for the whole agent (DOM listeners aren't owned by any one feature either); no-op if wrapEvents hasn't run yet, see FeatureBase#debug
   * @param {boolean} [opts.globalEvents=false] - equivalent to also calling debugEvents()
   */
  debug (opts = {}) {
    const { globalEvents, ...featureOpts } = opts
    Object.values(this.features || {}).forEach(feature => feature.debug(featureOpts))
    if (globalEvents) this.debugEvents()
  }

  /**
   * Turns on console.debug logging of the agent's global lifecycle/data dispatch events
   * (see dispatchGlobalEvent) -- init, feature load, drain, harvest, API calls, warnings.
   * Note this listens on the shared window-level event namespace, so on a page running
   * multiple agent instances, this logs every instance's events, not just this one's.
   */
  debugEvents () {
    if (this.__nrDebugEventsListener) return
    this.__nrDebugEventsListener = (e) => debugLog(`[agent ${this.agentIdentifier}]`, e.detail)
    globalScope.addEventListener(GLOBAL_EVENT_NAMESPACE, this.__nrDebugEventsListener)
  }
}
