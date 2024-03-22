/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ee } from '../event-emitter/contextual-ee'
import { dispatchGlobalEvent } from '../dispatch/global-event'

const expectedFlags = ['stn', 'err', 'ins', 'spa', 'sr']
const noFlagFeatures = ['xhr', 'pvt']

const sentIds = new Set()

/** Note that this function only processes each unique flag ONCE, with the first occurrence of each flag and numeric value determining its switch on/off setting. */
export function activateFeatures (flags, agentIdentifier) {
  const sharedEE = ee.get(agentIdentifier)
  activatedFeatures[agentIdentifier] ??= {}
  if (!(flags && typeof flags === 'object')) return
  if (sentIds.has(agentIdentifier)) return

  /** Flags returned from RUM call */
  Object.entries(flags).forEach(([flag, num]) => {
    emitFlag(flag, num)
  })

  /** We gate all features behind a flag for consistency, but some features dont require entitlements before running
   * So we make our own flags and return them as truthy for now
  */
  noFlagFeatures.forEach(flag => {
    emitFlag(flag, 1)
  })

  /** Any features that happen to fail to get a flag back from the RUM call would be blocking the rest of the features from operating, so return 0 by default */
  expectedFlags.forEach(flag => {
    emitFlag(flag, 0)
  })

  sentIds.add(agentIdentifier)

  // let any window level subscribers know that the agent is running
  dispatchGlobalEvent({ loaded: true })

  function emitFlag (flagName, value) {
    if (activatedFeatures[agentIdentifier][flagName] !== undefined) return
    sharedEE.emit(`rumresp-${flagName}`, [value])
    activatedFeatures[agentIdentifier][flagName] = value
  }
}

export const activatedFeatures = {}
