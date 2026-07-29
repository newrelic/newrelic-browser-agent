/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from '../../common/util/console'
import { BEFORE_HARVEST } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupBeforeHarvestAPI (agent) {
  setupAPI(BEFORE_HARVEST, function (callback) {
    if (typeof callback !== 'function') {
      warn(72)
      return
    }
    agent.runtime.beforeHarvest = callback
  }, agent)
}
