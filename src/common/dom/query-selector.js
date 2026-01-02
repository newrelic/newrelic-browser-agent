/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const isValidSelector = (selector) => {
  if (!selector || typeof selector !== 'string') return false
  try {
    document.createDocumentFragment().querySelector(selector)
  } catch {
    return false
  }
  return true
}
