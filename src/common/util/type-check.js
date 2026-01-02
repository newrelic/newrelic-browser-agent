/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests a passed object to see if it is a pure object or not. All non-primatives in JS
 * are technically objects and would pass a `typeof` check.
 * @param {*} obj Input object to be tested
**/
export function isPureObject (obj) {
  return obj?.constructor === ({}).constructor
}
