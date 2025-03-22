/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export class TaskTimer {
  startTime = performance.now()
  endTime = undefined
  duration = undefined

  start () {
    this.startTime = performance.now()
  }

  end () {
    this.endTime = performance.now()
    this.setDuration()
  }

  setDuration () {
    this.duration = (this.endTime || performance.now()) - this.startTime
  }

  get isLongTask () {
    this.setDuration()
    return this.duration > 50
  }
}
