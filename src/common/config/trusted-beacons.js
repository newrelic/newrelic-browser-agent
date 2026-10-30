/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * The beacon endpoints each agent was configured with. This is kept in module scope rather than on the agent
 * instance because the instance is reachable by any script on the page (newrelic.initializedAgents).
 * @type {WeakMap<object, Set<string>>}
 */
const trustedBeacons = new WeakMap()

/**
 * Records the harvest endpoints an agent was configured with and makes them read-only on the agent. This is called each
 * time the agent is (re)configured, so an intentional late `init` update becomes the new trusted set, while runtime
 * writes from anywhere else are rejected.
 * @param {object} agent The agent instance, after its `info` and `init` have been set.
 */
export function trustBeacons (agent) {
  trustedBeacons.set(agent, new Set([agent.info.errorBeacon, agent.init.proxy.beacon].filter(Boolean)))

  ;['beacon', 'errorBeacon'].forEach(key => Object.defineProperty(agent.info, key, { writable: false, configurable: false }))
  // The model's own `proxy` object can be shared between agents, so freeze a copy rather than the original.
  agent.init.proxy = Object.freeze({ ...agent.init.proxy })
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
