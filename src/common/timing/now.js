/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// This is our own layer around performance.now. It's not strictly necessary, but we keep it in case of future mod-ing of the value for refactor purpose.
export function now () {
  return Math.floor(performance.now())
}
