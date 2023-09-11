import { setAPI, setTopLevelCallers } from '../api/api'
import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '../../common/window/nreum'
import { getConfiguration, setConfiguration, setInfo, setLoaderConfig, setRuntime } from '../../common/config/config'
import { activatedFeatures } from '../../common/util/feature-flags'
import { isWorkerScope } from '../../common/constants/runtime'
import { redefinePublicPath } from './public-path'
import { handle } from '../../common/event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { ee } from '../../common/event-emitter/contextual-ee'
import { FEATURE_NAMES } from '../features/features'

let alreadySetOnce = false // the configure() function can run multiple times in agent lifecycle

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
  const agentEE = ee.get(agentIdentifier)

  setConfiguration(agentIdentifier, init || {})
  // eslint-disable-next-line camelcase
  setLoaderConfig(agentIdentifier, loader_config || {})

  info.jsAttributes ??= {}
  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes.isWorker = true
  }
  setInfo(agentIdentifier, info)

  const updatedInit = getConfiguration(agentIdentifier)
  const internalTrafficList = [info.beacon, info.errorBeacon]
  if (!alreadySetOnce) {
    alreadySetOnce = true
    if (updatedInit.proxy.assets) {
      redefinePublicPath(updatedInit.proxy.assets + '/') // much like the info.beacon & init.proxy.beacon, this input should not end in a slash, but one is needed for webpack concat
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/AssetsUrl/Changed'], undefined, FEATURE_NAMES.metrics, agentEE)
      internalTrafficList.push(updatedInit.proxy.assets)
    }
    if (updatedInit.proxy.beacon) {
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/BeaconUrl/Changed'], undefined, FEATURE_NAMES.metrics, agentEE)
      internalTrafficList.push(updatedInit.proxy.beacon)
    }
  }

  runtime.denyList = [
    ...(updatedInit.ajax.deny_list || []),
    ...(updatedInit.ajax.block_internal ? internalTrafficList : [])
  ]
  setRuntime(agentIdentifier, runtime)

  setTopLevelCallers()
  const api = setAPI(agentIdentifier, forceDrain)
  gosNREUMInitializedAgents(agentIdentifier, api, 'api')
  gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')
  addToNREUM('activatedFeatures', activatedFeatures)

  return api
}
