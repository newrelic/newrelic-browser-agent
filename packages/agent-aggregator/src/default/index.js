// import core from 'nr-browser-core'
import { setInfo, setConfiguration } from 'nr-browser-common/src/config/config'
import { global as globalDrain } from 'nr-browser-common/src/drain/drain'
import { sendRUM } from 'nr-browser-page-view-timing/src/aggregate'
import { activateFeatures } from 'nr-browser-common/src/util/feature-flags'

if (NREUM){
  // Features are activated using the legacy setToken function name via JSONP
  NREUM.setToken = activateFeatures
  if (NREUM.info) {
    console.log("setInfo", NREUM.info)
    setInfo(NREUM.info)
  }
  if (NREUM.init){
    console.log("setConfiguration", NREUM.init)
    setConfiguration(NREUM.init)
  }
}

sendRUM()


// .. other features too

globalDrain('api')
globalDrain('feature')
// core.internal.drain.global('api')
// core.internal.drain.global('feature')
