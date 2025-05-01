/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { originTime } from '../../common/constants/runtime'
import { handle } from '../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../features/features'
import { ADD_TO_TRACE } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupAddToTraceAPI (agent) {
  setupAPI(ADD_TO_TRACE, function (evt) {
    if (!(evt && typeof evt === 'object' && evt.name && evt.start)) return

    const report = {
      n: evt.name,
      s: evt.start - originTime,
      e: (evt.end || evt.start) - originTime,
      o: evt.origin || '',
      t: 'api'
    }

    handle('bstApi', [report], undefined, FEATURE_NAMES.sessionTrace, agent.ee)
  }, agent)
}
