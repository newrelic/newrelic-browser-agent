/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export function isIFrameWindow (windowObject) {
  if (!windowObject) return false
  return windowObject.self !== windowObject.top
}
