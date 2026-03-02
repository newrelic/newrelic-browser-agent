/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { setTopLevelCallers } from '../api/topLevelCallers'
import { gosCDN } from '../../common/window/nreum'
import { mergeInfo } from '../../common/config/info'
import { mergeInit } from '../../common/config/init'
import { mergeRuntime } from '../../common/config/runtime'
import { isWorkerScope } from '../../common/constants/runtime'
import { redefinePublicPath } from './public-path'
import { ee } from '../../common/event-emitter/contextual-ee'
import { dispatchGlobalEvent } from '../../common/dispatch/global-event'
import { mergeLoaderConfig } from '../../common/config/loader-config'

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

  agent.utils ??= {}

  if (!agent.utils.configured) {
    if (updatedInit.proxy.assets) {
      redefinePublicPath(updatedInit.proxy.assets)
      internalTrafficList.push(updatedInit.proxy.assets)
    }
    if (updatedInit.proxy.beacon) internalTrafficList.push(updatedInit.proxy.beacon)
    agent.beacons = [...internalTrafficList]

    setTopLevelCallers(agent) // no need to set global APIs on newrelic obj more than once
  }

  runtime.denyList = [
    ...(updatedInit.ajax.deny_list || []),
    ...(updatedInit.ajax.block_internal ? internalTrafficList : [])
  ]
  runtime.ptid = agent.agentIdentifier
  runtime.loaderType = loaderType
  agent.runtime = mergeRuntime(runtime)

  if (!agent.utils.configured) {
    agent.ee = ee.get(agent.agentIdentifier)
    agent.utils.drainRegistry = new Map()

    agent.exposed = exposed

    dispatchGlobalEvent({
      drained: !!agent.utils.activatedFeatures,
      type: 'lifecycle',
      name: 'initialize',
      feature: undefined,
      data: agent.config
    })

    agent.utils.configured = true
  }
}
