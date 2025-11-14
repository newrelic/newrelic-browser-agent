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
  #registeredAt = now()
  #deregisteredAt = undefined
  #fetchStart = undefined
  #fetchEnd = undefined

  #getTimingValue (beginning = 0, end = 0) {
    return Math.floor(end - beginning)
  }

  update ({ fetchStart, fetchEnd, deregisteredAt }) {
    this.#fetchStart ||= fetchStart
    this.#fetchEnd ||= fetchEnd
    this.#deregisteredAt ||= deregisteredAt
  }

  get timeToBeRequested () {
    return this.#getTimingValue(0, this.#fetchStart)
  }

  get timeToFetch () {
    return this.#getTimingValue(this.#fetchStart, this.#fetchEnd)
  }

  get timeToRegister () {
    return this.#getTimingValue(this.#fetchEnd, this.#registeredAt)
  }

  get duration () {
    return this.#getTimingValue(this.#fetchEnd, this.#deregisteredAt || now())
  }
}
