/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export class Timer {
  constructor (opts, ms) {
    if (!opts.onEnd) throw new Error('onEnd handler is required')
    if (!ms) throw new Error('ms duration is required')
    this.onEnd = opts.onEnd
    this.initialMs = ms
    this.startTimestamp = Date.now()

    this.timer = this.create(this.onEnd, ms)
  }

  create (cb, ms) {
    if (this.timer) this.clear()
    return setTimeout(() => cb ? cb() : this.onEnd(), ms || this.initialMs)
  }

  clear () {
    clearTimeout(this.timer)
    this.timer = null
  }

  end () {
    this.clear()
    this.onEnd()
  }

  isValid () {
    return this.initialMs - (Date.now() - this.startTimestamp) > 0
  }
}
