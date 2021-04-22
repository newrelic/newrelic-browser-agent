/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Start assigning ids at 1 so 0 can always be used for window, without
// actually setting it (which would create a global variable).
var index = 1
var prop = 'nr@id'
var getOrSet = require('gos')

module.exports = id

// Always returns id of obj, may tag obj with an id in the process.
function id (obj) {
  var type = typeof obj
  // We can only tag objects, functions, and arrays with ids.
  // For all primitive values we instead return -1.
  if (!obj || !(type === 'object' || type === 'function')) return -1
  if (obj === window) return 0

  return getOrSet(obj, prop, function () { return index++ })
}
