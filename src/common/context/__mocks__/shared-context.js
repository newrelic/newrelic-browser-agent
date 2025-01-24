/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const SharedContext = jest.fn(function () {
  this.sharedContext = {
    agentIdentifier: 'abcd',
    ee: {
      on: jest.fn()
    },
    timeKeeper: {
      now: jest.fn(() => performance.now())
    }
  }
})
