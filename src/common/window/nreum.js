import { now } from '../timing/now'
import { globalScope } from '../constants/runtime'

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
      SI: globalScope.setImmediate,
      CT: globalScope.clearTimeout,
      XHR: globalScope.XMLHttpRequest,
      REQ: globalScope.Request,
      EV: globalScope.Event,
      PR: globalScope.Promise,
      MO: globalScope.MutationObserver, // this'll be undefined if not in a web window
      FETCH: globalScope.fetch
    }
  }
  return nr
}

/**
 * Get or set the agent instance under the associated identifier on the global newrelic object.
 * @param {String} id - agent identifier
 * @param {Object} newAgentInstance - for SET, the agent object tied to the id
 * @returns New or existing agent instance under newrelic.initializedAgent[id], or undefined if it does not exist for GET.
 */
export function gosNREUMInitializedAgents (id, newAgentInstance) {
  let nr = gosNREUM()
  nr.initializedAgents = nr.initializedAgents || {}
  let existingAgent = nr.initializedAgents[id]
  if (existingAgent || newAgentInstance === undefined) return existingAgent // agents should only be set once upon their respective initializations for SET, and GET should grab whatever value exists

  newAgentInstance.initializedAt = {
    ms: now(),
    date: new Date()
  }
  nr.initializedAgents[id] = newAgentInstance

  return newAgentInstance
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
