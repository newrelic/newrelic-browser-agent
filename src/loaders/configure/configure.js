import { setAPI, setTopLevelCallers } from '../api/api'
import { addToNREUM, gosCDN } from '../../common/window/nreum'
import { setInfo } from '../../common/config/info'
import { getConfiguration, setConfiguration } from '../../common/config/init'
import { setLoaderConfig } from '../../common/config/loader-config'
import { setRuntime } from '../../common/config/runtime'
import { activatedFeatures } from '../../common/util/feature-flags'
import { isWorkerScope } from '../../common/constants/runtime'
import { redefinePublicPath } from './public-path'
import { ee } from '../../common/event-emitter/contextual-ee'

let alreadySetOnce = false // the configure() function can run multiple times in agent lifecycle

/**
 * Sets or re-sets the agent's configuration values from global settings. This also attach those as properties to the agent instance.
 */
export function configure (agent, opts = {}, loaderType, forceDrain) {
  // eslint-disable-next-line camelcase
  let { init, info, loader_config, runtime = {}, exposed = true } = opts
  runtime.loaderType = loaderType
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
  runtime.ptid = agent.agentIdentifier
  setRuntime(agent.agentIdentifier, runtime)

  agent.ee = ee.get(agent.agentIdentifier)

  if (agent.api === undefined) agent.api = setAPI(agent.agentIdentifier, forceDrain, agent.runSoftNavOverSpa)
  if (agent.exposed === undefined) agent.exposed = exposed
  alreadySetOnce = true
}
