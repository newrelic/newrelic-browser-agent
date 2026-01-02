/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { originTime } from '../../common/constants/runtime'
import { handle } from '../../common/event-emitter/handle'
import { warn } from '../../common/util/console'
import { CUSTOM_METRIC_CHANNEL } from '../../features/metrics/constants'
import { FEATURE_NAMES } from '../features/features'
import { ADD_PAGE_ACTION, FINISHED, prefix } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupFinishedAPI (agent) {
  setupAPI(FINISHED, function (unixTime = Date.now()) {
    const relativeTime = unixTime - originTime
    if (relativeTime < 0) warn(62, unixTime)
    handle(CUSTOM_METRIC_CHANNEL, [FINISHED, { time: relativeTime }], undefined, FEATURE_NAMES.metrics, agent.ee)
    agent.addToTrace({ name: FINISHED, start: unixTime, origin: 'nr' })
    handle(prefix + ADD_PAGE_ACTION, [relativeTime, FINISHED], undefined, FEATURE_NAMES.genericEvents, agent.ee)
  }, agent)
}
