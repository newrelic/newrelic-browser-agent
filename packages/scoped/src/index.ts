import { getRuntime, setConfiguration, getConfiguration, setInfo, getInfo, setLoaderConfig, getLoaderConfig } from '../../../modules/common/config/config'
import { ieVersion } from '../../../modules/common/browser-version/ie-version'
import { NrInterface, NrInitialize } from './types'
import { initialize as initializeApi, noticeError } from './utils/api/api'
import { buildConfigs } from './utils/config/build-configs'
import { features } from './utils/features/features'
import { initializeFeatures } from './utils/features/initialize'
import { gosNREUMInitializedAgents } from '../../../modules/common/window/nreum'

if (ieVersion === 6) getRuntime().maxBytes = 2000
else getRuntime().maxBytes = 30000

let initialized = false

const initialize: NrInitialize = async (options) => {
  try {
    if (initialized) return false
    initialized = true
    const { info, config, loader_config, initializationID } = buildConfigs(options)
    if (info) setInfo(info)
    if (config) setConfiguration(config)
    if (loader_config) setLoaderConfig(config)

    const initializedFeatures = await initializeFeatures()
    const initializedApis = await initializeApi()
    
    gosNREUMInitializedAgents(initializationID, initializedFeatures, 'features')
    return true
  } catch (err) {
    return false
  }
}

const nr: NrInterface = {
  get config() {
    return {
      info: getInfo(),
      config: getConfiguration(),
      loader_config: getLoaderConfig()
    }
  },
  features,
  start: initialize,
  noticeError,
}

export default nr