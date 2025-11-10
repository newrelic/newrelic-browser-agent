/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { now } from '../common/timing/now'

/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export class Timing {
  registeredAt = now()

  fetchStart = undefined
  fetchEnd = undefined
  loadedAt = undefined
  unloadedAt = undefined

  getTimingValue (beginning = 0, end = 0) {
    return Math.floor(end - beginning)
  }

  get timeToBeRequested () {
    return this.getTimingValue(0, this.fetchStart)
  }

  get timeToFetch () {
    return this.getTimingValue(this.fetchStart, this.fetchEnd)
  }

  get timeToRegister () {
    return this.getTimingValue(this.fetchEnd, this.registeredAt)
  }

  get timeToLoaded () {
    return this.getTimingValue(this.fetchEnd, this.loadedAt)
  }

  get timeToUnloaded () {
    return this.getTimingValue(this.fetchEnd, this.unloadedAt)
  }

  get timeAlive () {
    return this.getTimingValue(this.loadedAt, this.unloadedAt)
  }
}
