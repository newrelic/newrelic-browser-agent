import { setAPI, setTopLevelCallers } from '../api/api'
import { addToNREUM, gosCDN } from '../../common/window/nreum'
import { getConfiguration, setConfiguration, setInfo, setLoaderConfig, setRuntime } from '../../common/config/config'
import { activatedFeatures } from '../../common/util/feature-flags'
import { isWorkerScope } from '../../common/constants/runtime'
import { redefinePublicPath } from './public-path'

let alreadySetOnce = false // the configure() function can run multiple times in agent lifecycle

/**
 * Sets or re-sets the agent's configuration values from global settings. This also attach those as properties to the agent instance.
 */
export function configure (agent, opts = {}, loaderType, forceDrain) {
  // eslint-disable-next-line camelcase
  let { init, info, loader_config, runtime = { loaderType }, exposed = true } = opts
  const nr = gosCDN()
  if (!info) {
    init = nr.init
    info = nr.info
    // eslint-disable-next-line camelcase
    loader_config = nr.loader_config
  }

  setConfiguration(agent.agentIdentifier, init || {})
  // eslint-disable-next-line camelcase
  setLoaderConfig(agent.agentIdentifier, loader_config || {})

  info.jsAttributes ??= {}
  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes.isWorker = true
  }
  setInfo(agent.agentIdentifier, info)

  const updatedInit = getConfiguration(agent.agentIdentifier)
  const internalTrafficList = [info.beacon, info.errorBeacon]

  if (!alreadySetOnce) {
    if (updatedInit.proxy.assets) {
      redefinePublicPath(updatedInit.proxy.assets)
      internalTrafficList.push(updatedInit.proxy.assets)
    }
    if (updatedInit.proxy.beacon) internalTrafficList.push(updatedInit.proxy.beacon)

    setTopLevelCallers() // no need to set global APIs on newrelic obj more than once
    addToNREUM('activatedFeatures', activatedFeatures)

    // Update if soft_navigations is allowed to run AND part of this agent build, used to override old spa functions.
    agent.runSoftNavOverSpa &&= (updatedInit.soft_navigations.enabled === true && updatedInit.feature_flags.includes('soft_nav'))
  }

  runtime.denyList = [
    ...(updatedInit.ajax.deny_list || []),
    ...(updatedInit.ajax.block_internal ? internalTrafficList : [])
  ]
  setRuntime(agent.agentIdentifier, runtime)

  if (agent.api === undefined) agent.api = setAPI(agent.agentIdentifier, forceDrain, agent.runSoftNavOverSpa)
  if (agent.exposed === undefined) agent.exposed = exposed
  alreadySetOnce = true
}
