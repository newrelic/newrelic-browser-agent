/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../event-emitter/handle'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'

/*
 * The beacon endpoints each agent was configured with. This is kept in module scope rather than on the agent
 * instance because the instance is reachable by any script on the page (newrelic.initializedAgents).
 * @type {WeakMap<object, Set<string>>}
 */
const trustedBeacons = new WeakMap()

/**
 * Replaces a property with a read-only accessor. Writes are ignored (rather than thrown) and reported, so a page script
 * attempting to change locked config is visible in supportability metrics. The property can't be redefined afterwards.
 * @param {object} target The object holding the property.
 * @param {string} key The property to lock.
 * @param {string} label How the property is named in the supportability metric, e.g. `info.licenseKey`.
 * @param {object} agent The agent instance, used to report write attempts.
 */
function lockProperty (target, key, label, agent) {
  const value = target[key]
  Object.defineProperty(target, key, {
    get: () => value,
    set: () => handle(SUPPORTABILITY_METRIC_CHANNEL, [`Config/Locked/${label}/Changed`], undefined, FEATURE_NAMES.metrics, agent.ee),
    enumerable: true,
    configurable: false
  })
}

/**
 * Records the harvest endpoints an agent was configured with and makes them, along with the license key and application ID, read-only on the agent. This is called each
 * time the agent is (re)configured, so an intentional late `init` update becomes the new trusted set, while runtime
 * writes from anywhere else are rejected.
 * @param {object} agent The agent instance, after its `info` and `init` have been set.
 */
export function trustBeacons (agent) {
  trustedBeacons.set(agent, new Set([agent.info.errorBeacon, agent.init.proxy.beacon].filter(Boolean)))

  /* licenseKey and applicationID decide which account and entity the data is reported to, so they get the same
     protection as the endpoints: a late write could otherwise re-route harvests to another account. */
  ;['beacon', 'errorBeacon', 'licenseKey', 'applicationID'].forEach(key => lockProperty(agent.info, key, `info.${key}`, agent))
  /* The model's own `proxy` object can be shared between agents, so freeze a copy rather than the original.
     This covers `proxy.assets` too. It is only read while configuring (it sets the path lazy chunks load from, which
     lives inside the bundle), so freezing it is sufficient and there is nothing to check at chunk-load time. */
  const proxy = { ...agent.init.proxy }
  ;['beacon', 'assets'].forEach(key => lockProperty(proxy, key, `proxy.${key}`, agent))
  agent.init.proxy = Object.freeze(proxy)
}

/**
 * Checks a harvest destination against the endpoints the agent was configured with.
 * @param {object} agent The agent instance.
 * @param {string} beacon The destination as it appears in the harvest URL, between the protocol and the endpoint path.
 * @returns {boolean} True if the destination is one the agent was configured with. Agents that were never configured are not restricted.
 */
export function isTrustedBeacon (agent, beacon) {
  const trusted = trustedBeacons.get(agent)
  return !trusted || trusted.has(beacon)
}
