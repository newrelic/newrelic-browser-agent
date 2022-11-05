/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { mapOwn } from './map-own'
import { ee } from '../event-emitter/contextual-ee'
import { drain } from '../drain/drain'

export function activateFeatures (flags, agentIdentifier) {
  var sharedEE = ee.get(agentIdentifier)
  if (!(flags && typeof flags === 'object')) return
  mapOwn(flags, function (flag, val) {
    if (!val || activatedFeatures[flag]) return
    sharedEE.emit('feat-' + flag, [])
    activatedFeatures[flag] = true
  })
}

export const activatedFeatures = {}
