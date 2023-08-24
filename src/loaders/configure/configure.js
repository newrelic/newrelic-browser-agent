import { setAPI, setTopLevelCallers } from '../api/api'
import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '../../common/window/nreum'
import { getConfiguration, setConfiguration, setInfo, setLoaderConfig, setRuntime } from '../../common/config/config'
import { activatedFeatures } from '../../common/util/feature-flags'
import { isWorkerScope } from '../../common/constants/runtime'
import { validateAssetUrl } from '../../common/url/check-url'
import { redefinePublicPath } from './public-path'
import { warn } from '../../common/util/console'

export function configure (agentIdentifier, opts = {}, loaderType, forceDrain) {
  let { init, info, loader_config, runtime = { loaderType }, exposed = true } = opts
  const nr = gosCDN()
  if (!info) {
    init = nr.init
    info = nr.info
    loader_config = nr.loader_config
  }

  const retVal = validateAssetUrl(init.assetsPath)
  if (retVal !== '') redefinePublicPath(retVal)
  else warn('New public path must be a valid URL. Chunk origin remains unchanged.')
  setConfiguration(agentIdentifier, init || {})
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
