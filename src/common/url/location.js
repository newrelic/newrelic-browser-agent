/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This method only exists to support testing in JIL and can be removed once tests are migrated to WDIO.
 * @returns global scope location
 */
export function getLocation () {
  return '' + location
}
