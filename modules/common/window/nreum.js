
import * as env from '../constants/environment-variables'

export const defaults = {
  agent:  `js-agent.newrelic.com/${env.SUBPATH}nr${env.VERSION}.min.js`,
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net',
  version: env.VERSION
}

export function gosNREUM(){
  if (!window.NREUM) {
    window.NREUM = {}
  }
  if (typeof (window.newrelic) === 'undefined') window.newrelic = window.NREUM
  return window.NREUM
}

export function gosNREUMInfo(){
  let nr = gosNREUM()
  const externallySupplied = nr.info || {}
  
  nr.info = {
    beacon: defaults.beacon,
    errorBeacon: defaults.errorBeacon,
    agent:  defaults.agent,
    ...externallySupplied
  }
  
  return nr
}

export function gosNREUMLoaderConfig(){
  let nr = gosNREUM()
  const externallySupplied = nr.loader_config || {}
  
  nr.loader_config = {
    ...externallySupplied
  }
  
  return nr
}

export function gosNREUMInit(){
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

export function addFnToNREUM(fnName, fn){
  let nr = gosNREUM()
  nr[fnName] = fn
}

export function gosCDN() {
  console.log("set up NREUM for the CDN!")
  gosNREUMInfo()
  gosNREUMInit()
  gosNREUMOriginals()
  gosNREUMLoaderConfig()
  return gosNREUM()
}
