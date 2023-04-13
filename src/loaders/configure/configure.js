import { setAPI, setTopLevelCallers } from '../api/api'
import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '../../common/window/nreum'
import { setConfiguration, setInfo, setLoaderConfig, setRuntime, getRuntime } from '../../common/config/config'
import { activateFeatures, activatedFeatures } from '../../common/util/feature-flags'
import { isBrowserScope, isWorkerScope } from '../../common/util/global-scope'

export function configure (agentIdentifier, opts = {}, loaderType, forceDrain) {
  let { init, info, loader_config, runtime = { loaderType }, exposed = true } = opts
  const nr = gosCDN()
  if (!info) {
    init = nr.init
    info = nr.info
    loader_config = nr.loader_config
  }

  setConfiguration(agentIdentifier, init || {})
  setLoaderConfig(agentIdentifier, loader_config || {})
  setRuntime(agentIdentifier, runtime)

  info.jsAttributes ??= {}
  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes.isWorker = true
  }

  setInfo(agentIdentifier, info)

  setTopLevelCallers()
  const api = setAPI(agentIdentifier, forceDrain)
  gosNREUMInitializedAgents(agentIdentifier, api, 'api')
  gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')
  addToNREUM('activatedFeatures', activatedFeatures)
  addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))

  return api
}
