/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ADD_RELEASE } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupAddReleaseAPI (agent) {
  let releaseCount = 0
  setupAPI(ADD_RELEASE, function (name, id) {
    if (++releaseCount > 10) return
    this.runtime.releaseIds[name.slice(-200)] = ('' + id).slice(-200)
  }, agent)
}
