
import { now } from '../timing/now'

export const defaults = {
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net'
}

export function gosNREUM() {
  if (!window.NREUM) {
    window.NREUM = {}
  }
  if (typeof (window.newrelic) === 'undefined') window.newrelic = window.NREUM
  return window.NREUM
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
    var win = window
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
      MO: win.MutationObserver,
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
