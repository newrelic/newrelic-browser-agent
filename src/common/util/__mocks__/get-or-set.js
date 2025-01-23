/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const getOrSet = jest.fn((obj, prop, getVal) => {
  if (obj[prop]) return obj[prop]
  obj[prop] = getVal()
  return obj[prop]
})
