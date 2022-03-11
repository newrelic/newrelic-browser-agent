import { runtime, setConfiguration, setInfo, setLoaderConfig } from '../../../modules/common/config/config'
import { ieVersion } from '../../../modules/common/browser-version/ie-version'
import { NrConfig, NrFeatures, NrInfo, NrLoaderConfig, NrStoreError } from './types'
import * as api from './utils/api'

if (ieVersion === 6) runtime.maxBytes = 2000
else runtime.maxBytes = 30000

let initialized = false

const nr = {
  init: initialize,
  ...api
}

export default nr

export { initialize as init }

async function initialize({info, config, loader_config, disabled = []}: {info: NrInfo, config?: NrConfig, loader_config?: NrLoaderConfig, disabled: NrFeatures[]}) {
  if (initialized) return
  setInfo(info)
  if (config) setConfiguration(config)
  if (loader_config) setLoaderConfig(config)
  if (!initialized && !disabled.includes(NrFeatures.JSERRORS)) {
    const { storeError, initialize }: {storeError: NrStoreError, initialize: any} = await import('../../../modules/features/js-errors/aggregate')
    nr.storeError = storeError
    console.log('set store error!', nr)
    initialize(true)
  }

  initialized = true
}
