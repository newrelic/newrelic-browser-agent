/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from './console'
import { stringify } from './stringify'

export function trackObjectAttributeSize (parent, object) {
  if (!parent) warn(64)
  const originalAttribute = parent[object] ??= {}
  const output = { bytes: Object.keys(originalAttribute).reduce((acc, key) => acc + key.length + stringify(originalAttribute[key]).length, 0) }
  // proxy attribute to calculate its size when changed
  parent[object] = new Proxy(originalAttribute, {
    set (target, prop, value) {
      output.bytes += prop.length + stringify(value).length
      target[prop] = value
      return true
    },
    deleteProperty (target, prop) {
      output.bytes -= prop.length + stringify(target[prop]).length
      return delete target[prop]
    }
  })

  return output
}
