
import * as env from '../constants/environment-variables'

export const defaults = {
  agent:  `js-agent.newrelic.com/${env.PATH}nr.js`,
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net',
  version: env.VERSION
}

export function getOrSetNREUM(){
  if (!window.NREUM) {
    window.NREUM = {}
  }
  return window.NREUM
}

export function getOrSetNREUMInfo(){
  let nr = getOrSetNREUM()
  if (!nr.info){
    nr.info = {
      beacon: defaults.beacon,
      errorBeacon: defaults.errorBeacon,
      agent:  defaults.agent,
    }
  }
  return nr
}

export function getOrSetNREUMOriginals() {
  let nr = getOrSetNREUM()
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

export function setupLegacyAgent() {
  getOrSetNREUMInfo()
  getOrSetNREUMOriginals()
  console.log("NREUM!", NREUM)
}
