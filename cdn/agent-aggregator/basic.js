// import core from 'nr-browser-core'
// import { setInfo, setConfiguration } from '../../../modules/common/config/config'
import { runtime, getConfiguration, getInfo, getLoaderConfig } from '../../modules/common/config/config'
// import { global as globalDrain } from '../../modules/common/drain/drain'
import { drain } from '../../modules/common/drain/drain'
import { activateFeatures } from '../../modules/common/util/feature-flags'
import { addFnToNREUM, gosNREUM } from '../../modules/common/window/nreum'
import { sendRUM } from '../../modules/features/page-view-event/aggregate'
import { init as initPageViewTimings } from '../../modules/features/page-view-timing/aggregate'
import { conditionallySet } from '../../modules/common/cookie/nav-cookie'

// const nr = gosNREUM()
// console.log("NR IN THE AGGREGATOR!", nr)
// const autorun = typeof (nr.autorun) !== 'undefined' ? nr.autorun : true
const autorun = typeof (runtime.autorun) !== 'undefined' ? runtime.autorun : true

console.log("config...", getConfiguration())
console.log("info...", getInfo())
console.log("loader_config...", getLoaderConfig())

// Features are activated using the legacy setToken function name via JSONP
// nr.setToken = activateFeatures
addFnToNREUM('setToken', activateFeatures)
// setInfo(nr.info)
// setConfiguration(nr.init)
// setLoaderConfig(nr.loader_config)

// page-view-event aggregation
if (autorun) sendRUM()
initPageViewTimings() // page-view-timings aggregation (./agent/timings.js)
// .. other features too (every feature except SPA)

drain('api')
drain('feature')
// globalDrain('api')
// globalDrain('feature')
// core.internal.drain.global('api')
// core.internal.drain.global('feature')

// Set a cookie when the page unloads. Consume this cookie on the next page to get a 'start time'.
// The navigation start time cookie is removed when the browser supports the web timing API.
function finalHarvest (e) {
  harvest.sendFinal(loader, false)
  // write navigation start time cookie if needed
  conditionallySet
}
