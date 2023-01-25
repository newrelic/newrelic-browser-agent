/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { mapOwn } from './map-own'
import { ee } from '../event-emitter/contextual-ee'
import { gosNREUM } from '../window/nreum'
import { drain } from '../drain/drain'
import { FEATURE_NAMES } from '../../loaders/features/features'

export function activateFeatures (flags, agentIdentifier) {
  const nr = gosNREUM()
  var sharedEE = ee.get(agentIdentifier)
  if (!(flags && typeof flags === 'object')) return
  mapOwn(flags, function (flag, val) {
    if (!val) return sharedEE.emit('block-' + flag, [])
    if (!val || activatedFeatures[flag]) return
    sharedEE.emit('feat-' + flag, [])
    activatedFeatures[flag] = true
  })

  drain(agentIdentifier, FEATURE_NAMES.pageViewEvent)
}

export const activatedFeatures = {}
