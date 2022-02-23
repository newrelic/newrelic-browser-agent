
import * as env from '../constants/environment-variables'

export const defaults = {
  agent:  `js-agent.newrelic.com/${env.PATH}nr.js`,
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net',
}

function setNREUM() {
  console.log("setNREUM!")
  if (!window.NREUM) {
    window.NREUM = {}
  }

  if (!window.NREUM.info){
    window.NREUM.info = {
      beacon: defaults.beacon,
      errorBeacon: defaults.errorBeacon,
      agent:  defaults.agent,
    }
  }

  if (!window.NREUM.o) {
    var win = window
    // var doc = win.document
    var XHR = win.XMLHttpRequest

    NREUM.o = {
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

  console.log("NREUM!", NREUM)
}

export default setNREUM()
