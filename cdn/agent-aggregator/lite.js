import { runtime} from '../../modules/common/config/config'
import { drain } from '../../modules/common/drain/drain'
import { features } from './util/features'
import { activateFeatures } from '../../modules/common/util/feature-flags'
import { addToNREUM, NREUMinitialized } from '../../modules/common/window/nreum'

const autorun = typeof (runtime.autorun) !== 'undefined' ? runtime.autorun : true
// this determines what features to build into the aggregator
// this could <possibly> be optimized to run on one file via env var
// running out of time so keeping in 3 files for now
const build = 'lite'

// Features are activated using the legacy setToken function name via JSONP
addToNREUM('setToken', activateFeatures)
initializeFeatures()

async function initializeFeatures() {
    // load all the features associated with this build type
    await Promise.all(features[build].map(async feature => {
        const { initialize } = await import(`../../modules/features/${feature}/aggregate`)
        initialize()
    }))
    // once ALL the features all loaded, drain all the buffers
    drainAll()
    NREUMinitialized()
}

function drainAll(){
    drain('api')
    drain('feature')
}