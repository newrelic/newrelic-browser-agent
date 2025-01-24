/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const Harvest = jest.fn(function () {
  this.sharedContext = {
    agentIdentifier: 'abcd'
  }
  this.sendX = jest.fn()
  this.send = jest.fn()
  this.obfuscateAndSend = jest.fn()
  this._send = jest.fn()
  this.baseQueryString = jest.fn()
  this.cleanPayload = jest.fn()
  this.on = jest.fn()
})
