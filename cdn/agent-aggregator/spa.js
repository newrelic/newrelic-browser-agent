// import core from 'nr-browser-core'
import {initialize as initializeErrors} from '../../modules/features/js-errors/aggregate'
import {initialize as initializeXhr} from '../../modules/features/ajax/aggregate'
import { setInfo, setConfiguration, setLoaderConfig } from '../../modules/common/config/config'
import { global as globalDrain } from '../../modules/common/drain/drain'
import { addFnToNREUM, gosNREUM } from '../../modules/common/window/nreum'
import { conditionallySet } from '../../modules/common/cookie/nav-cookie'

const nr = gosNREUM()
const autorun = typeof (nr.autorun) !== 'undefined' ? nr.autorun : true

// Features are activated using the legacy setToken function name via JSONP
addFnToNREUM('setToken', activateFeatures)
setInfo(nr.info)
setConfiguration(nr.init)
setLoaderConfig(nr.loader_config)
 
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
