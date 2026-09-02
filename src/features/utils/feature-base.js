/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { deregisterDrain } from '../../common/drain/drain'
import { debugInstance, instrumentEventEmitter, instrumentDomListeners } from '../../common/debug/instrument-prototype'

export class FeatureBase {
  constructor (agentRef, featureName) {
    /** @type {Object} */
    this.agentRef = agentRef
    /** @type {import('../../common/event-emitter/contextual-ee').ee} */
    this.ee = agentRef?.ee
    /** @type {string} */
    this.featureName = featureName
    /**
     * Blocked can be used to prevent aggregation and harvest after initialization time of the feature.
     * This can currently happen if RUM response setToken flag is 0, which is tied to ingest account entitlement info.
     * @type {boolean}
     */
    this.blocked = false
  }

  deregisterDrain () {
    deregisterDrain(this.agentRef, this.featureName)
  }

  /**
   * Turns on console.debug logging of this feature's internals.
   * @param {Object} [opts]
   * @param {boolean} [opts.instrumentation=true] - log this instance's own class methods (args and return values). Only affects this instance -- other instances of the same class are unaffected. NOTE: most Instrument classes have no own public methods at all (their logic runs in closures registered in the constructor -- see opts.eventEmitter/opts.listeners), so this alone is often silent for the instrument side of a feature.
   * @param {boolean} [opts.eventEmitter=false] - log activity on the shared event emitter (`this.ee`), including registered listeners firing (e.g. `this.ee.on('internal-error', ...)`). NOTE: the event emitter is shared by every feature on this agent, not owned by this one -- turning this on here logs every feature's emit/on/get activity for the whole agent, not just this feature's.
   * @param {boolean} [opts.listeners=false] - log DOM listeners (window/document/XHR addEventListener) firing, by tapping the existing wrap-events.js mechanism. NOTE: same agent-wide scope caveat as eventEmitter, plus it's a no-op if wrapEvents hasn't run yet for this agent (needs session_trace, ajax, or session tracking enabled).
   */
  debug (opts = {}) {
    const { instrumentation = true, eventEmitter = false, listeners = false } = opts
    this.__nrDebugOpts = opts // remembered so a later-loading aggregate (see InstrumentBase#importAggregator) can be debugged with the same opts
    if (instrumentation) debugInstance(this, `${this.featureName}:${this.moduleType || 'feature'}`)
    if (eventEmitter && this.ee) instrumentEventEmitter(this.ee, `${this.agentRef?.agentIdentifier}:event-emitter`)
    if (listeners) instrumentDomListeners(this.agentRef)
  }
}
