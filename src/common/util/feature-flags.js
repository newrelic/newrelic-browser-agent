/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { mapOwn } from './map-own'
import { ee } from '../event-emitter/contextual-ee'
import { handle } from '../event-emitter/handle'
import { drain } from '../drain/drain'
import { FEATURE_NAMES } from '../../loaders/features/features'

const bucketMap = {
  stn: [FEATURE_NAMES.sessionTrace],
  err: [FEATURE_NAMES.jserrors, FEATURE_NAMES.metrics],
  ins: [FEATURE_NAMES.pageAction],
  spa: [FEATURE_NAMES.spa]
}

export function activateFeatures (flags, agentIdentifier) {
  var sharedEE = ee.get(agentIdentifier)
  if (!(flags && typeof flags === 'object')) return
  mapOwn(flags, function (flag, val) {
    if (!val) {
      return (bucketMap[flag] || []).forEach(feat => {
        handle('block-' + flag, [], undefined, feat, sharedEE)
      })
    }

    if (activatedFeatures[flag]) {
      return
    }

    handle('feat-' + flag, [], undefined, bucketMap[flag], sharedEE)
    activatedFeatures[flag] = true
  })
  drain(agentIdentifier, FEATURE_NAMES.pageViewEvent)
}

export const activatedFeatures = {}
