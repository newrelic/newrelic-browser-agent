import { setAPI, setTopLevelCallers, CUSTOM_ATTR_GROUP } from '../api/api'
import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '../../common/window/nreum'
import { setConfiguration, setInfo, setLoaderConfig, setRuntime } from '../../common/config/config'
import { activateFeatures, activatedFeatures } from '../../common/util/feature-flags'
import { isBrowserScope, isWorkerScope } from '../../common/util/global-scope'
import { getAllStorageItemsOfGroup } from '../../common/window/session-storage'

export function configure (agentIdentifier, opts = {}, loaderType, forceDrain) {
  let { init, info, loader_config, runtime = { loaderType }, exposed = true } = opts
  const nr = gosCDN()
  if (!info) {
    init = nr.init
    info = nr.info
    loader_config = nr.loader_config
  }

  info.jsAttributes ??= {}
  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes.isWorker = true
  }
  if (isBrowserScope) { // retrieve & re-add all of the persisted setCustomAttribute|setUserId k-v from previous page load(s)
    let prevPageSessionJsAttrs = getAllStorageItemsOfGroup(CUSTOM_ATTR_GROUP)
    Object.assign(info.jsAttributes, prevPageSessionJsAttrs)
  }

  setInfo(agentIdentifier, info)
  setConfiguration(agentIdentifier, init || {})
  setLoaderConfig(agentIdentifier, loader_config || {})
  setRuntime(agentIdentifier, runtime)

  setTopLevelCallers()
  const api = setAPI(agentIdentifier, forceDrain)
  gosNREUMInitializedAgents(agentIdentifier, api, 'api')
  gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')
  addToNREUM('activatedFeatures', activatedFeatures)
  addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))

  return api
}
