/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var canonicalFunctionNameRe = /([a-z0-9]+)$/i
export function canonicalFunctionName (orig) {
  if (!orig) return

  var match = orig.match(canonicalFunctionNameRe)
  if (match) return match[1]

  return
}
