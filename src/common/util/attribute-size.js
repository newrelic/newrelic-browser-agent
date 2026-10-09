/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { stringify } from './stringify'

export function trackObjectAttributeSize (parent, object) {
  const originalAttribute = parent[object] ??= {}
  const output = { bytes: Object.keys(originalAttribute).reduce((acc, key) => acc + key.length + stringify(originalAttribute[key]).length, 0) }
  // proxy attribute to calculate its size when changed
  parent[object] = new Proxy(originalAttribute, {
    set (target, prop, value) {
      /* An overwrite replaces the existing entry, so its previous size must be removed first. Otherwise repeated sets of the same key inflate the count far beyond the real size. */
      if (Object.prototype.hasOwnProperty.call(target, prop)) output.bytes -= prop.length + stringify(target[prop]).length
      output.bytes += prop.length + stringify(value).length
      target[prop] = value
      return true
    },
    deleteProperty (target, prop) {
      /* Deleting a key that was never set removes nothing, so the count must not change. */
      if (Object.prototype.hasOwnProperty.call(target, prop)) output.bytes -= prop.length + stringify(target[prop]).length
      return delete target[prop]
    }
  })

  return output
}
