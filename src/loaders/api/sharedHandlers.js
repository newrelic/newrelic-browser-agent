/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { dispatchGlobalEvent } from '../../common/dispatch/global-event'
import { handle } from '../../common/event-emitter/handle'
import { now } from '../../common/timing/now'
import { warn } from '../../common/util/console'
import { activatedFeatures } from '../../common/util/feature-flags'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { AgentBase } from '../agent-base'
import { FEATURE_NAMES } from '../features/features'
import { prefix } from './constants'

export function setupAPI (name, fn, agent) {
  // We only set the global API event if the API is not already overridden from the default
  if (agent[name] !== AgentBase.prototype[name]) return
  agent[name] = function () {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/' + name + '/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
    dispatchGlobalEvent({
      agentIdentifier: agent.agentIdentifier,
      drained: !!activatedFeatures?.[agent.agentIdentifier],
      type: 'data',
      name: 'api',
      feature: prefix + name,
      data: { }
    })
    try {
      return fn.apply(this, arguments)
    } catch (err) {
      warn(23, err)
    }
  }
}

/**
   * Attach the key-value attribute onto agent payloads. All browser events in NR will be affected.
   * @param {Agent} agent the agent instance reference
   * @param {string} key
   * @param {string|number|boolean|null} value - null indicates the key should be removed or erased
   * @param {string} apiName
   * @param {boolean} addToBrowserStorage - whether this attribute should be stored in browser storage API and retrieved by the next agent context or initialization
   * @returns @see apiCall
   */
export function appendJsAttribute (agent, key, value, apiName, addToBrowserStorage) {
  const currentInfo = agent.info
  if (value === null) {
    delete currentInfo.jsAttributes[key]
  } else {
    agent.info = { ...agent.info, jsAttributes: { ...currentInfo.jsAttributes, [key]: value } }
  }
  if (addToBrowserStorage || value === null) handle(prefix + apiName, [now(), key, value], undefined, FEATURE_NAMES.browserStorage, agent.ee)
}
