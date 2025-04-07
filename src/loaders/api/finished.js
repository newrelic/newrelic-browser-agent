/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { originTime } from '../../common/constants/runtime'
import { handle } from '../../common/event-emitter/handle'
import { now } from '../../common/timing/now'
import { CUSTOM_METRIC_CHANNEL } from '../../features/metrics/constants'
import { FEATURE_NAMES } from '../features/features'
import { ADD_PAGE_ACTION, FINISHED, prefix } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupFinishedAPI (agent) {
  setupAPI(FINISHED, function (time = now()) {
    handle(CUSTOM_METRIC_CHANNEL, [FINISHED, { time }], undefined, FEATURE_NAMES.metrics, agent.ee)
    agent.addToTrace({ name: FINISHED, start: time + originTime, origin: 'nr' })
    handle(prefix + ADD_PAGE_ACTION, [time, FINISHED], undefined, FEATURE_NAMES.genericEvents, agent.ee)
  }, agent)
}
