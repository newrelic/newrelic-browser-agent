import { getRuntime, setConfiguration, setInfo, setLoaderConfig } from '../../../modules/common/config/config'
import { ieVersion } from '../../../modules/common/browser-version/ie-version'
import { NrConfig, NrFeatures, NrInfo, NrLoaderConfig, NrStoreError } from './types'
import { initialize as initializeApi, storeError } from './utils/api-defaults'

if (ieVersion === 6) getRuntime().maxBytes = 2000
else getRuntime().maxBytes = 30000

let initialized = false

let _enabledFeatures:  NrFeatures[] = [ 
  NrFeatures.AJAX, NrFeatures.JSERRORS, NrFeatures.PAGE_VIEW_EVENT, NrFeatures.PAGE_VIEW_TIMING
]

// let _disabledFeatures: NrFeatures[] = []

const nr = {
  disable: (features: NrFeatures[] | NrFeatures) => {
    if (initialized) return console.error("Features must be disabled before starting the NR Agent")
    if (Array.isArray(features))_enabledFeatures = _enabledFeatures.filter(f => !features.includes(f))
    else _enabledFeatures = _enabledFeatures.filter(f => features !== f)
  },
  get features(): NrFeatures[] {
    return _enabledFeatures
  },
  start: initialize,
  storeError
}


export default nr

export { initialize as init }

async function initialize({ info, config, loader_config }: { info: NrInfo, config?: NrConfig, loader_config?: NrLoaderConfig }) {
  if (initialized) return
  setInfo(info)
  if (config) setConfiguration(config)
  if (loader_config) setLoaderConfig(config)

  await initializeFeatures()
  initialized = true
  await initializeApi(_enabledFeatures)
  console.log("initialized API!")
}

function initializeFeatures() {
  return Promise.all(_enabledFeatures.map(async feature => {
    if (feature === NrFeatures.JSERRORS) {
      const { initialize: initializeInstrument }: { initialize: Function } = await import('../../../modules/features/js-errors/instrument')
      initializeInstrument()
      const { initialize: initializeAggregate }: { storeError: NrStoreError, initialize: any } = await import('../../../modules/features/js-errors/aggregate')
      initializeAggregate(true)
    }
  }))
}
