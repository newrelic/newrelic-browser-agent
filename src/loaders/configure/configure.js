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

  agent.runtime ??= mergeRuntime(runtime)

  // Apply proxy settings whenever configure is called (supports late {init} setting)
  if (updatedInit.proxy.assets) {
    redefinePublicPath(updatedInit.proxy.assets)
  }

  if (!agent.runtime.configured) {
    Object.defineProperty(agent, 'beacons', {
      get () {
        const beacons = [agent.info.beacon, agent.info.errorBeacon]
        if (agent.init.proxy.assets) beacons.push(agent.init.proxy.assets)
        if (agent.init.proxy.beacon) beacons.push(agent.init.proxy.beacon)
        return beacons
      }
    })

    Object.defineProperty(agent.runtime, 'denyList', {
      get () {
        // Compute the internal traffic list fresh each time to ensure beacons array is current
        const currentInternalList = [...agent.beacons]
        return [
          ...(agent.init.ajax.deny_list || []),
          ...(agent.init.ajax.block_internal ? currentInternalList : [])
        ]
      }
    })
    agent.runtime.ptid = agent.agentIdentifier

    setTopLevelCallers(agent) // no need to set global APIs on newrelic obj more than once

    agent.runtime.loaderType = loaderType

    agent.ee = ee.get(agent.agentIdentifier)

    agent.exposed = exposed

    dispatchGlobalEvent({
      drained: !!agent.runtime.activatedFeatures,
      type: 'lifecycle',
      name: 'initialize',
      feature: undefined,
      data: agent.config
    })

    agent.runtime.configured = true
  }
}
