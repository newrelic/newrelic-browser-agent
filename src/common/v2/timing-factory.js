/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export function timingFactory (getLazyValue = () => {}, override) {
  return {
    get: () => (override !== undefined ? override : getLazyValue()),
    set: (newValue) => { override = newValue }
  }
}
