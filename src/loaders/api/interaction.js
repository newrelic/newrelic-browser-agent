/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { handle } from '../../common/event-emitter/handle'
import { now } from '../../common/timing/now'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { FEATURE_NAMES } from '../features/features'
import { INTERACTION, SET_CURRENT_ROUTE_NAME, spaPrefix } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupInteractionAPI (agent) {
  const tracerEE = agent.ee.get('tracer')

  setupAPI(INTERACTION, function (options) {
    return new InteractionHandle().get(typeof options === 'object' ? options : {})
  }, agent)

  function InteractionHandle () { }

  const InteractionApiProto = InteractionHandle.prototype = {
    createTracer: function (name, cb) {
      // Primarily used by old SPA feature to create custom child tracers under an interaction.
      // Soft navigations won't support Tracer nodes, but this fn should still work the same otherwise (e.g., run the orig cb).
      var contextStore = {}
      var ixn = this
      var hasCb = typeof cb === 'function'
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/createTracer/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
      return function () {
        tracerEE.emit((hasCb ? '' : 'no-') + 'fn-start', [now(), ixn, hasCb], contextStore)
        if (hasCb) {
          try {
            return cb.apply(this, arguments)
          } catch (err) {
            const error = typeof err === 'string' ? new Error(err) : err
            tracerEE.emit('fn-err', [arguments, this, error], contextStore)
            // the error came from outside the agent, so don't swallow
            throw error
          } finally {
            tracerEE.emit('fn-end', [now()], contextStore)
          }
        }
      }
    }
  }

  ;['actionText', 'setName', 'setAttribute', 'save', 'ignore', 'onEnd', 'getContext', 'end', 'get'].forEach((name) => {
    setupAPI.apply(this, [name, function () {
      handle(spaPrefix + name, [performance.now(), ...arguments], this, FEATURE_NAMES.softNav, agent.ee)
      return this
    }, agent, InteractionApiProto])
  })

  setupAPI(SET_CURRENT_ROUTE_NAME, function () {
    handle(spaPrefix + 'routeName', [performance.now(), ...arguments], undefined, FEATURE_NAMES.softNav, agent.ee)
  }, agent)
}
