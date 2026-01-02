/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { now } from '../../common/timing/now'
import { prefix, SET_PAGE_VIEW_NAME } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupSetPageViewNameAPI (agent) {
  setupAPI(SET_PAGE_VIEW_NAME, function (name, host) {
    if (typeof name !== 'string') return
    if (name.charAt(0) !== '/') name = '/' + name
    agent.runtime.customTransaction = (host || 'http://custom.transaction') + name
    handle(prefix + SET_PAGE_VIEW_NAME, [now()], undefined, undefined, agent.ee)
  }, agent)
}
