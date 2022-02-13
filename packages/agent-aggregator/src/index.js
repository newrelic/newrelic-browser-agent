// import core from 'nr-browser-core'
import {initialize as initializeErrors} from 'nr-browser-err-aggregate'
import {initialize as initializeXhr} from 'nr-browser-xhr-aggregate'
import { setInfo, setConfiguration } from 'nr-browser-common/src/config/config'
import { global as globalDrain } from 'nr-browser-common/src/drain/drain'

// set configuration from global NREUM
if (NREUM && NREUM.info) {
  setInfo(NREUM.info)
}

if (NREUM && NREUM.init) {
  setConfiguration(NREUM.init)
}

initializeErrors(true)
initializeXhr(true)

globalDrain('api')
globalDrain('feature')
// core.internal.drain.global('api')
// core.internal.drain.global('feature')
