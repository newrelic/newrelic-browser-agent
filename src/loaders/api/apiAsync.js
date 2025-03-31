/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../features/features'
import { handle } from '../../common/event-emitter/handle'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { single } from '../../common/util/invoke'
import { CUSTOM_METRIC_CHANNEL } from '../../features/metrics/constants'
import { originTime } from '../../common/constants/runtime'

export function setAsyncAPI (agent) {
  const api = {
    finished: single(finished),
    setErrorHandler,
    addToTrace,
    addRelease
  }

  // Hook all of the api functions up to the queues/stubs created in loader/api.js
  Object.entries(api).forEach(([fnName, fnCall]) => registerHandler('api-' + fnName, fnCall, 'api', agent.ee))

  // All API functions get passed the time they were called as their
  // first parameter. These functions can be called asynchronously.

  function finished (t, providedTime) {
    const time = providedTime ? providedTime - originTime : t
    handle(CUSTOM_METRIC_CHANNEL, ['finished', { time }], undefined, FEATURE_NAMES.metrics, agent.ee)
    addToTrace(t, { name: 'finished', start: time + originTime, origin: 'nr' })
    handle('api-addPageAction', [time, 'finished'], undefined, FEATURE_NAMES.genericEvents, agent.ee)
  }

  function addToTrace (_, evt) {
    if (!(evt && typeof evt === 'object' && evt.name && evt.start)) return

    const report = {
      n: evt.name,
      s: evt.start - originTime,
      e: (evt.end || evt.start) - originTime,
      o: evt.origin || '',
      t: 'api'
    }

    handle('bstApi', [report], undefined, FEATURE_NAMES.sessionTrace, agent.ee)
  }

  function setErrorHandler (_, handler) {
    agent.runtime.onerror = handler
  }

  let releaseCount = 0
  function addRelease (_, name, id) {
    if (++releaseCount > 10) return
    agent.runtime.releaseIds[name.slice(-200)] = ('' + id).slice(-200)
  }
}
