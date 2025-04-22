/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { setAPI, setTopLevelCallers } from '../api/api'
import { addToNREUM, gosCDN } from '../../common/window/nreum'
import { mergeInfo } from '../../common/config/info'
import { mergeInit } from '../../common/config/init'
import { mergeRuntime } from '../../common/config/runtime'
import { activatedFeatures } from '../../common/util/feature-flags'
import { isWorkerScope } from '../../common/constants/runtime'
import { redefinePublicPath } from './public-path'
import { ee } from '../../common/event-emitter/contextual-ee'
import { dispatchGlobalEvent } from '../../common/dispatch/global-event'
import { mergeLoaderConfig } from '../../common/config/loader-config'

const alreadySetOnce = new Set() // the configure() function can run multiple times in agent lifecycle for different agents

/**
 * Sets or re-sets the agent's configuration values from global settings. This also attach those as properties to the agent instance.
 * IMPORTANT: setNREUMInitializedAgent must be called on the agent prior to calling this function.
 */
export function configure (agent, opts = {}, loaderType, forceDrain) {
  // eslint-disable-next-line camelcase
  let { init, info, loader_config, runtime = {}, exposed = true } = opts
  if (!info) {
    const nr = gosCDN()
    init = nr.init
    info = nr.info
    // eslint-disable-next-line camelcase
    loader_config = nr.loader_config
  }

  agent.init = mergeInit(init || {})
  // eslint-disable-next-line camelcase
  agent.loader_config = mergeLoaderConfig(loader_config || {})

  info.jsAttributes ??= {}
  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes.isWorker = true
  }
  agent.info = mergeInfo(info)

  const updatedInit = agent.init
  const internalTrafficList = [info.beacon, info.errorBeacon]

  if (!alreadySetOnce.has(agent.agentIdentifier)) {
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
  runtime.loaderType = loaderType
  agent.runtime = mergeRuntime(runtime)

  if (!alreadySetOnce.has(agent.agentIdentifier)) {
    agent.ee = ee.get(agent.agentIdentifier)
    agent.exposed = exposed
    setAPI(agent, forceDrain) // assign our API functions to the agent instance

    dispatchGlobalEvent({
      agentIdentifier: agent.agentIdentifier,
      drained: !!activatedFeatures?.[agent.agentIdentifier],
      type: 'lifecycle',
      name: 'initialize',
      feature: undefined,
      data: agent.config
    })
  }

  alreadySetOnce.add(agent.agentIdentifier)
}
