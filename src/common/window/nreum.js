/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../constants/runtime'
import { now } from '../timing/now'
import { isNative } from '../util/monkey-patched'

export const defaults = {
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net'
}

export function gosNREUM () {
  if (!globalScope.NREUM) {
    globalScope.NREUM = {}
  }
  if (typeof globalScope.newrelic === 'undefined') globalScope.newrelic = globalScope.NREUM
  return globalScope.NREUM
}

export function gosNREUMInfo () {
  let nr = gosNREUM()
  const externallySupplied = nr.info || {}

  nr.info = {
    beacon: defaults.beacon,
    errorBeacon: defaults.errorBeacon,
    ...externallySupplied
  }

  return nr
}

export function gosNREUMLoaderConfig () {
  let nr = gosNREUM()
  const externallySupplied = nr.loader_config || {}

  nr.loader_config = {
    ...externallySupplied
  }

  return nr
}

export function gosNREUMInit () {
  let nr = gosNREUM()
  const externallySupplied = nr.init || {}

  nr.init = {
    ...externallySupplied
  }

  return nr
}

export function gosNREUMOriginals () {
  let nr = gosNREUM()
  if (!nr.o) {
    nr.o = {
      ST: globalScope.setTimeout,
      SI: globalScope.setImmediate || globalScope.setInterval,
      CT: globalScope.clearTimeout,
      XHR: globalScope.XMLHttpRequest,
      REQ: globalScope.Request,
      EV: globalScope.Event,
      PR: globalScope.Promise,
      MO: globalScope.MutationObserver, // this'll be undefined if not in a web window
      FETCH: globalScope.fetch,
      WS: globalScope.WebSocket
    }
    isNative(...Object.values(nr.o)) // Warns if the originals are not native, which is typically required for the agent to work properly
  }
  return nr
}

export function setNREUMInitializedAgent (id, newAgentInstance) {
  let nr = gosNREUM()
  nr.initializedAgents ??= {}
  newAgentInstance.initializedAt = {
    ms: now(),
    date: new Date()
  }
  nr.initializedAgents[id] = newAgentInstance
}

/**
 * Get the agent instance under the associated identifier on the global newrelic object.
 * @see setNREUMInitializedAgents
 * @returns Existing agent instance under newrelic.initializedAgent[id], or undefined if it does not exist.
 */
export function getNREUMInitializedAgent (id) {
  let nr = gosNREUM()
  return nr.initializedAgents?.[id]
}

export function addToNREUM (fnName, fn) {
  let nr = gosNREUM()
  nr[fnName] = fn
}

export function NREUMinitialized () {
  const nr = gosNREUM()
  nr.initialized = true
}

export function gosCDN () {
  gosNREUMInfo()
  gosNREUMInit()
  gosNREUMOriginals()
  gosNREUMLoaderConfig()
  return gosNREUM()
}
