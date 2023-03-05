import { setAPI } from '../api/api'
import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '../../common/window/nreum'
import { setConfiguration, setInfo, setLoaderConfig, setRuntime } from '../../common/config/config'
import { activateFeatures, activatedFeatures } from '../../common/util/feature-flags'
import { isWorkerScope } from '../../common/util/global-scope'

export function configure (agentIdentifier, opts = {}, loaderType, forceDrain) {
  let { init, info, loader_config, runtime = { loaderType }, exposed = true } = opts
  const nr = gosCDN()
  let api = {}
  if (!info) {
    init = nr.init
    info = nr.info
    loader_config = nr.loader_config
    api = nr
  }

  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes = { ...info.jsAttributes, isWorker: true }
  }

  setInfo(agentIdentifier, info)
  setConfiguration(agentIdentifier, init || {})
  setLoaderConfig(agentIdentifier, loader_config || {})
  setRuntime(agentIdentifier, runtime)

  setAPI(agentIdentifier, api, forceDrain)
  gosNREUMInitializedAgents(agentIdentifier, nr, 'api')
  gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')

  addToNREUM('activatedFeatures', activatedFeatures)
  addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))

  return api
}
