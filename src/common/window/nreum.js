
import { now } from '../timing/now'
import { globalScope } from '../util/global-scope'

export const defaults = {
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net'
}

export function gosNREUM() {
  if (!globalScope?.NREUM) {
    globalScope.NREUM = {}
  }
  if (typeof (globalScope?.newrelic) === 'undefined') globalScope.newrelic = globalScope.NREUM
  return globalScope.NREUM
}

export function gosNREUMInfo() {
  let nr = gosNREUM()
  const externallySupplied = nr.info || {}

  nr.info = {
    beacon: defaults.beacon,
    errorBeacon: defaults.errorBeacon,
    ...externallySupplied
  }

  return nr
}

export function gosNREUMLoaderConfig() {
  let nr = gosNREUM()
  const externallySupplied = nr.loader_config || {}

  nr.loader_config = {
    ...externallySupplied
  }

  return nr
}

export function gosNREUMInit() {
  let nr = gosNREUM()
  const externallySupplied = nr.init || {}

  nr.init = {
    ...externallySupplied
  }

  return nr
}

export function gosNREUMOriginals() {
  let nr = gosNREUM()
  if (!nr.o) {
    var win = self
    // var doc = win.document
    var XHR = win.XMLHttpRequest

    nr.o = {
      ST: setTimeout,
      SI: win.setImmediate,
      CT: clearTimeout,
      XHR: XHR,
      REQ: win.Request,
      EV: win.Event,
      PR: win.Promise,
      MO: win.MutationObserver, // this'll be undefined if not in a web window
      FETCH: win.fetch
    }
  }
  return nr
}

export function gosNREUMInitializedAgents(id, obj, target) {
  let nr = gosNREUM()
  const externallySupplied = nr.initializedAgents || {}
  const curr = externallySupplied[id] || {}

  if (!Object.keys(curr).length) {
    curr.initializedAt = {
      ms: now(),
      date: new Date()
    }
  }

  nr.initializedAgents = {
    ...externallySupplied,
    [id]: {
      ...curr,
      [target]: obj
    }
  }

  return nr
}

export function addToNREUM(fnName, fn) {
  let nr = gosNREUM()
  nr[fnName] = fn
}

export function NREUMinitialized() {
  const nr = gosNREUM()
  nr.initialized = true
}

export function gosCDN() {
  gosNREUMInfo()
  gosNREUMInit()
  gosNREUMOriginals()
  gosNREUMLoaderConfig()
  return gosNREUM()
}
