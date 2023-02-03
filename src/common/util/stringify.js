/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee } from '../event-emitter/contextual-ee'

const getCircularReplacer = () => {
  const seen = new WeakSet()
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return
      }
      seen.add(value)
    }
    return value
  }
}

export function stringify (val) {
  try {
    return JSON.stringify(val, getCircularReplacer())
  } catch (e) {
    try {
      ee.emit('internal-error', [e])
    } catch (err) {
      // do nothing
    }
  }
}
