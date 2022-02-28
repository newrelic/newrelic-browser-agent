// import core from 'nr-browser-core'
import {initialize as initializeErrors} from 'nr-browser-err-aggregate'
import {initialize as initializeXhr} from 'nr-browser-xhr-aggregate'
import { setInfo, setConfiguration } from 'nr-browser-common/src/config/config'
import { global as globalDrain } from 'nr-browser-common/src/drain/drain'
import { getOrSetNREUM } from 'nr-browser-common/src/window/nreum'
import { conditionallySet } from 'nr-browser-common/src/timing/start-time'

const nr = getOrSetNREUM()
const autorun = typeof (nr.autorun) !== 'undefined' ? nr.autorun : true

if (nr){
  // Features are activated using the legacy setToken function name via JSONP
  nr.setToken = activateFeatures
  if (nr.info) {
    console.log("setInfo", nr.info)
    setInfo(nr.info)
  }
  if (nr.init){
    console.log("setConfiguration", nr.init)
    setConfiguration(nr.init)
  }
}

if (autorun) sendRUM()
initializeErrors(true)
initializeXhr(true)

// .. other features too

globalDrain('api')
globalDrain('feature')
// core.internal.drain.global('api')
// core.internal.drain.global('feature')

// Set a cookie when the page unloads. Consume this cookie on the next page to get a 'start time'.
// The navigation start time cookie is removed when the browser supports the web timing API.
function finalHarvest (e) {
  harvest.sendFinal(loader, false)
  // write navigation start time cookie if needed
  conditionallySet()
}
