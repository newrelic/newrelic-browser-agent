/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ADD_RELEASE } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupAddReleaseAPI (agent) {
  setupAPI(ADD_RELEASE, function (name, id) {
    if (++this.releaseCount > 10) return
    this.runtime.releaseIds[name.slice(-200)] = ('' + id).slice(-200)
  }, agent)
}
