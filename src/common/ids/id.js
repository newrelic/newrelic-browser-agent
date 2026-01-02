/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getOrSet } from '../util/get-or-set'
import { globalScope } from '../constants/runtime'

// Start assigning ids at 1 so 0 can always be used for Window or WorkerGlobalScope, without
// actually setting it (which would create a global variable).
let index = 1
const prop = 'nr@id'

/**
 * Tags a specified object with an identifier if it does not already
 * have one. If the object is the global scope, zero will be returned
 * and the object will not be modified. If the object already contains
 * an identifier, it will be returned without modification. If the passed
 * value is not an object, function, or array, -1 will be returned without
 * modifying the passed value.
 * @param {object|function|array} obj Object to be tagged with an identifier
 * @returns {number} Identifier of the given object
 */
export function id (obj) {
  const type = typeof obj
  // We can only tag objects, functions, and arrays with ids.
  // For all primitive values we instead return -1.
  if (!obj || !(type === 'object' || type === 'function')) return -1
  if (obj === globalScope) return 0

  return getOrSet(obj, prop, function () { return index++ })
}
