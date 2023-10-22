/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ee } from '../event-emitter/contextual-ee'
import { handle } from '../event-emitter/handle'
import { FEATURE_NAMES } from '../../loaders/features/features'

const bucketMap = {
  stn: [FEATURE_NAMES.sessionTrace],
  err: [FEATURE_NAMES.jserrors, FEATURE_NAMES.metrics],
  ins: [FEATURE_NAMES.pageAction],
  spa: [FEATURE_NAMES.spa, FEATURE_NAMES.softNav],
  sr: [FEATURE_NAMES.sessionReplay, FEATURE_NAMES.sessionTrace]
}

const sentIds = new Set()

/** Note that this function only processes each unique flag ONCE, with the first occurrence of each flag and numeric value determining its switch on/off setting. */
export function activateFeatures (flags, agentIdentifier) {
  const sharedEE = ee.get(agentIdentifier)
  if (!(flags && typeof flags === 'object')) return

  if (!sentIds.has(agentIdentifier)) {
    Object.entries(flags).forEach(([flag, num]) => {
      if (bucketMap[flag]) {
        bucketMap[flag].forEach(feat => {
          if (!num) handle('block-' + flag, [], undefined, feat, sharedEE)
          else handle('feat-' + flag, [], undefined, feat, sharedEE)
          handle('rumresp-' + flag, [Boolean(num)], undefined, feat, sharedEE) // this is a duplicate of feat-/block- but makes awaiting for 1 event easier than 2
        })
      } else if (num) handle('feat-' + flag, [], undefined, undefined, sharedEE) // not sure what other flags are overlooked, but there's a test for ones not in the map --
      activatedFeatures[flag] = Boolean(num)
    })
  }

  // Let the features waiting on their respective flags know that RUM response was received and that any missing flags are interpreted as bad entitlement / "off".
  // Hence, those features will not be hanging forever if their flags aren't included in the response.
  Object.keys(bucketMap).forEach(flag => {
    if (activatedFeatures[flag] === undefined) {
      bucketMap[flag]?.forEach(feat => handle('rumresp-' + flag, [false], undefined, feat, sharedEE))
      activatedFeatures[flag] = false
    }
  })
  sentIds.add(agentIdentifier)
}

export const activatedFeatures = {}
