/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ee } from '../event-emitter/contextual-ee'
import { dispatchGlobalEvent } from '../dispatch/global-event'

const sentIds = new Set()

/** A map of feature flags and their values as provided by the rum call -- scoped by agent ID */
export const activatedFeatures = {}

/**
 * Sets the activatedFeatures object, dispatches the global loaded event,
 * and emits the rumresp flag to features
 * @param {{[key:string]:number}} flags key-val pair of flag names and numeric
 * @param {string} agentIdentifier agent instance identifier
 * @returns {void}
 */
export function activateFeatures (rumResponse, agentIdentifier) {
  activatedFeatures[agentIdentifier] ??= {}
  if (!rumResponse) return
  const { app, ...flags } = rumResponse
  const sharedEE = ee.get(agentIdentifier)
  if (!(flags && typeof flags === 'object')) return
  if (sentIds.has(agentIdentifier)) return

  sharedEE.emit('rumresp', [flags])
  activatedFeatures[agentIdentifier] = flags

  sentIds.add(agentIdentifier)

  // let any window level subscribers know that the agent is running
  dispatchGlobalEvent({ loaded: true })
}
