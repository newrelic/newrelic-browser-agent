/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export class TaskTimer {
  startTime = performance.now()
  duration = 0

  get isLongTask () {
    this.duration = performance.now() - this.startTime
    return this.duration > 50
  }
}
