import { getRuntime, setConfiguration, getConfiguration, setInfo, getInfo, setLoaderConfig, getLoaderConfig } from '../../../modules/common/config/config'
import { ieVersion } from '../../../modules/common/browser-version/ie-version'
import { NrConfig, NrFeatures, NrInfo, NrLoaderConfig, NrOptions } from './types'
import { initialize as initializeApi, storeError } from './utils/api/api'
import { buildConfigs } from './utils/config/build-configs'
import { initializeFeatures } from './utils/features/initialize'
import { gosNREUMInitializedAgents } from '../../../modules/common/window/nreum'

if (ieVersion === 6) getRuntime().maxBytes = 2000
else getRuntime().maxBytes = 30000

let initialized = false

let _enabledFeatures: NrFeatures[] = [
  NrFeatures.JSERRORS
]

const nr = {
  get config(): { info: NrInfo, config: NrConfig, loader_config: NrLoaderConfig } {
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
  try {
    if (initialized) return false
    initialized = true
    const { info, config, loader_config, disabled, initializationID } = buildConfigs(options)
    if (info) setInfo(info)
    if (config) setConfiguration(config)
    if (loader_config) setLoaderConfig(config)

    if (disabled) {
      disabled.forEach(key => {
        _enabledFeatures = _enabledFeatures.filter(x => x !== key)
      })
    }

    const initializedFeatures = await initializeFeatures(_enabledFeatures)
    await initializeApi(_enabledFeatures)
    
    gosNREUMInitializedAgents(initializationID, initializedFeatures, 'features')

    return true
  } catch (err) {
    return false
  }
}
