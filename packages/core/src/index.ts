import { setRuntime, setConfiguration, getConfiguration, setInfo, getInfo, setLoaderConfig, getLoaderConfig } from '../../../modules/common/config/config'
import { ieVersion } from '../../../modules/common/browser-version/ie-version'
import { NrInfo, NrConfig, NrLoaderConfig, NrOptions } from './types'
import { Api } from './utils/api/api'
import { buildConfigs } from './utils/config/build-configs'
import { Features } from './utils/features/features'
import { initializeFeatures } from './utils/features/initialize'
import { gosNREUMInitializedAgents } from '../../../modules/common/window/nreum'
import { generateRandomHexString } from '../../../modules/common/ids/unique-id'
import { Aggregator } from '../../../modules/common/aggregate/aggregator'

class NR {
  private _initialized = false
  private _id = generateRandomHexString(16);
  private _api = new Api(this._id)
  private _aggregator = new Aggregator({agentIdentifier: this._id})

  public get config(): { info: NrInfo, config: NrConfig, loader_config: NrLoaderConfig } {
    return {
      info: getInfo(this._id),
      config: getConfiguration(this._id),
      loader_config: getLoaderConfig(this._id)
    }
  }  
  public get initialized() { return this._initialized };
  public features = new Features()
  public start = async (options: NrOptions) => {
    if (this._initialized) return false
    try {
      
      this._initialized = true
      const { info, config, loader_config } = buildConfigs(options)
      if (info) setInfo(this._id, info)
      if (config) setConfiguration(this._id, config)
      if (loader_config) setLoaderConfig(this._id, config)
      setRuntime(this._id, {maxBytes: ieVersion === 6 ? 2000 : 30000})

      const initializedFeatures = await initializeFeatures(this._id, this._api, this._aggregator, this.features)

      gosNREUMInitializedAgents(this._id, initializedFeatures, 'features')

      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }
  public noticeError = (err: Error | String, customAttributes?: Object) => this._api.noticeError(err, customAttributes);
}

export default NR
