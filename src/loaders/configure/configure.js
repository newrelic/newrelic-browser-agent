import { setAPI, setTopLevelCallers } from '../api/api'
import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '../../common/window/nreum'
import { getConfiguration, setConfiguration, setInfo, setLoaderConfig, setRuntime } from '../../common/config/config'
import { activatedFeatures } from '../../common/util/feature-flags'
import { isWorkerScope } from '../../common/constants/runtime'

export function configure (agentIdentifier, opts = {}, loaderType, forceDrain) {
  // eslint-disable-next-line camelcase
  let { init, info, loader_config, runtime = { loaderType }, exposed = true } = opts
  const nr = gosCDN()
  if (!info) {
    init = nr.init
    info = nr.info
    // eslint-disable-next-line camelcase
    loader_config = nr.loader_config
  }

  setConfiguration(agentIdentifier, init || {})
  // eslint-disable-next-line camelcase
  setLoaderConfig(agentIdentifier, loader_config || {})

  info.jsAttributes ??= {}
  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes.isWorker = true
  }
  setInfo(agentIdentifier, info)

  const updatedInit = getConfiguration(agentIdentifier)
  runtime.denyList = [
    ...(updatedInit.ajax?.deny_list || []),
    ...(updatedInit.ajax?.block_internal
      ? [
          info.beacon,
          info.errorBeacon
        ]
      : [])
  ]
  setRuntime(agentIdentifier, runtime)

  setTopLevelCallers()
  const api = setAPI(agentIdentifier, forceDrain)
  gosNREUMInitializedAgents(agentIdentifier, api, 'api')
  gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')
  addToNREUM('activatedFeatures', activatedFeatures)

  return api
}
