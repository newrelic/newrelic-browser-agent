/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const TimeKeeper = jest.fn(function () {
  this.ready = true
  this.convertRelativeTimestamp = jest.fn()
  this.convertAbsoluteTimestamp = jest.fn()
  this.correctAbsoluteTimestamp = jest.fn()
  this.correctRelativeTimestamp = jest.fn()
})
