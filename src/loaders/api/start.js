/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { START } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupStartAPI (agent) {
  setupAPI(START, function () {
    agent.ee.emit('manual-start-all')
  }, agent)
}
