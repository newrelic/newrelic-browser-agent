/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export class PageMetadata {
  browserInteractions = []
  hasReplay = false
  hasTrace = false
  hasErrors = false
  // future... could track DT trace spans

  constructor (previousPageMetadata = {}) {
    Object.assign(this, previousPageMetadata)
    this.focusedAt = performance.now()
  }

  asEvent () {
    const now = performance.now()
    return {
      ...this,
      duration: now - this.focusedAt,
      blurredAt: now,
      eventType: 'PageMetadata'
    }
  }
}
