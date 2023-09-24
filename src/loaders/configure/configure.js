import { setAPI, setTopLevelCallers } from '../api/api'
import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '../../common/window/nreum'
import { setInfo, setLoaderConfig, setRuntime } from '../../common/config/config'
import { activatedFeatures } from '../../common/util/feature-flags'
import { isWorkerScope } from '../../common/constants/runtime'
import { redefinePublicPath } from './public-path'

let alreadySetOnce = false // the configure() function can run multiple times in agent lifecycle

export function configure (agentIdentifier, opts = {}, loaderType, forceDrain) {
  // eslint-disable-next-line camelcase
  let { init, info, loader_config, runtime = { loaderType }, exposed = true } = opts
  const nr = gosCDN()
  if (!info) {
    info = nr.info
    // eslint-disable-next-line camelcase
    loader_config = nr.loader_config
  }
  if (!init) init = nr.init

  // eslint-disable-next-line camelcase
  setLoaderConfig(agentIdentifier, loader_config || {})

  info.jsAttributes ??= {}
  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes.isWorker = true
  }
  setInfo(agentIdentifier, info)

  const internalTrafficList = [info.beacon, info.errorBeacon]
  if (!alreadySetOnce) {
    alreadySetOnce = true
    if (init?.proxy?.assets) {
      redefinePublicPath(init?.proxy?.assets + '/') // much like the info.beacon & init.proxy.beacon, this input should not end in a slash, but one is needed for webpack concat
      internalTrafficList.push(init?.proxy.assets)
    }
    if (init?.proxy?.beacon) internalTrafficList.push(init?.proxy?.beacon)
  }

  runtime.denyList = [
    ...(init?.ajax?.deny_list || []),
    ...(init?.ajax?.block_internal ? internalTrafficList : [])
  ]
  setRuntime(agentIdentifier, runtime)

  setTopLevelCallers()
  const api = setAPI(agentIdentifier, forceDrain)
  gosNREUMInitializedAgents(agentIdentifier, api, 'api')
  gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')
  addToNREUM('activatedFeatures', activatedFeatures)

  return api
}
