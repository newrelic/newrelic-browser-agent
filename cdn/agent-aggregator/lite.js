import { getRuntime } from '../../modules/common/config/config'
import { drain } from '../../modules/common/drain/drain'
import { features } from './util/features'
import { activateFeatures, activatedFeatures } from '../../modules/common/util/feature-flags'
import { addToNREUM } from '../../modules/common/window/nreum'
import { subscribeToUnload } from '../../modules/common/unload/unload'
import { finalHarvest } from '../../modules/common/harvest/final-harvest'
import { recordFrameworks } from '../../modules/common/metrics/framework-detection'

const autorun = typeof (getRuntime().autorun) !== 'undefined' ? getRuntime().autorun : true
// this determines what features to build into the aggregator
// this could <possibly> be optimized to run on one file via env var
// running out of time so keeping in 3 files for now
const build = 'lite'

// Features are activated using the legacy setToken function name via JSONP
addToNREUM('setToken', activateFeatures)

// import relevant feature aggregators
if (autorun) initializeFeatures()

// prepare agent for page unload
subscribeToUnload(finalHarvest)

// collect general supportability metrics
captureSupportabilityMetrics()

async function initializeFeatures() {
  // load all the features associated with this build type
  await Promise.all(features[build].map(async feature => {
    const { initialize } = await import(`../../modules/features/${feature}/aggregate`)
    initialize()
  }))
  // once ALL the features all initialized, drain all the buffers
  drainAll()
  // add the activated features from the setToken call to the window for testing purposes
  addToNREUM('activatedFeatures', activatedFeatures)
}

function drainAll() {
  drain('api')
  drain('feature')
}

function captureSupportabilityMetrics() {
  recordFrameworks()
  // others could go here
}
