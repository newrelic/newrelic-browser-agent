import { setRuntime, setConfiguration, getConfiguration, setInfo, getInfo, setLoaderConfig, getLoaderConfig } from '@newrelic/browser-agent-core/common/config/config'
import { ieVersion } from '@newrelic/browser-agent-core/common/browser-version/ie-version'
import { NrInfo, NrConfig, NrLoaderConfig, NrOptions } from './types'
import { Api } from './utils/api/api'
import { buildConfigs } from './utils/config/build-configs'
import { Features } from './utils/features/features'
import { initializeFeatures } from './utils/features/initialize'
import { gosNREUMInitializedAgents } from '@newrelic/browser-agent-core/common/window/nreum'
import { generateRandomHexString } from '@newrelic/browser-agent-core/common/ids/unique-id'
import { Aggregator } from '@newrelic/browser-agent-core/common/aggregate/aggregator'


export class BrowserAgent {
  private _initialized = false
  private _id = generateRandomHexString(16);
  private _api = new Api(this)
  private _aggregator = new Aggregator({ agentIdentifier: this._id })

  public get config(): { info: NrInfo, config: NrConfig, loader_config: NrLoaderConfig } {
    return {
      info: getInfo(this._id),
      config: getConfiguration(this._id),
      loader_config: getLoaderConfig(this._id)
    }
  }
  public get initialized() { return this._initialized };
  public get id() { return this._id }
  public features = new Features()
  public start = async (options: NrOptions) => {
    if (this._initialized) return false
    this._initialized = true
    const { info, config, loader_config } = buildConfigs(options)
    if (info) setInfo(this._id, info)
    if (config) setConfiguration(this._id, config)
    if (loader_config) setLoaderConfig(this._id, config)
    setRuntime(this._id, { maxBytes: 30000 })

    const initializedFeatures = await initializeFeatures(this._id, this._api, this._aggregator, this.features)

    gosNREUMInitializedAgents(this._id, initializedFeatures, 'features')

    return true

  }
  public noticeError = (err: Error | String, customAttributes?: Object) => this._api.noticeError(err, customAttributes);
}

export default BrowserAgent
