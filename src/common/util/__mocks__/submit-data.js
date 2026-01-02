/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const getSubmitMethod = jest.fn(() => jest.fn())
export const xhr = jest.fn(() => ({
  addEventListener: jest.fn()
}))
export const beacon = jest.fn(() => true)
