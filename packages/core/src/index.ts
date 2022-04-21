import { getRuntime, setConfiguration, getConfiguration, setInfo, getInfo, setLoaderConfig, getLoaderConfig } from '../../../modules/common/config/config'
import { ieVersion } from '../../../modules/common/browser-version/ie-version'
import { NrConfig, NrFeatures, NrInfo, NrLoaderConfig, NrOptions } from './types'
import { initialize as initializeApi, storeError } from './utils/api-defaults'
import { buildConfigs } from './utils/build-configs'
import { gosNREUMInitializedAgents } from '../../../modules/common/window/nreum'

if (ieVersion === 6) getRuntime().maxBytes = 2000
else getRuntime().maxBytes = 30000

let initialized = false

let _enabledFeatures:  NrFeatures[] = [ 
  NrFeatures.JSERRORS
]

const nr = {
  get config(): {info: NrInfo, config: NrConfig, loader_config: NrLoaderConfig} {
    return {
      info: getInfo(),
      config: getConfiguration(),
      loader_config: getLoaderConfig()
    }
  },
  get features(): NrFeatures[] {
    return _enabledFeatures
  },
  start: initialize,
  storeError
}

export default nr

async function initialize(options: NrOptions) {
  if (initialized) return
  const {info, config, loader_config, disabled} = buildConfigs(options)
  if (info) setInfo(info)
  if (config) setConfiguration(config)
  if (loader_config) setLoaderConfig(config)

  gosNREUMInitializedAgents({info, config, loader_config, disabled})

  if (disabled) {
    disabled.forEach(key => {
      _enabledFeatures = _enabledFeatures.filter(x => x !== key)
    })
  }

  await initializeFeatures()
  initialized = true
  await initializeApi(_enabledFeatures)
  console.log("initialized API!")
}

function initializeFeatures() {
  return Promise.all(_enabledFeatures.map(async feature => {
    if (feature === NrFeatures.JSERRORS) {
      const { initialize: initializeInstrument }: { initialize: any } = await import('../../../modules/features/js-errors/instrument')
      initializeInstrument(true)
      const { initialize: initializeAggregate }: { initialize: any } = await import('../../../modules/features/js-errors/aggregate')
      initializeAggregate(true)
    }
  }))
}
