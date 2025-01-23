/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const FeatureBase = jest.fn(function (agentIdentifier, featureName) {
  this.agentIdentifier = agentIdentifier
  this.featureName = featureName

  this.ee = {
    abort: jest.fn(),
    on: jest.fn(),
    emit: jest.fn()
  }
  this.blocked = false
})
