/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {Object} [target] - the target to be validated
 * @returns {boolean}
 */
export function isValidMFETarget (target = {}) {
  return !!(target.id && target.name)
}

/**
 * When given a valid target, returns an object with the MFE payload attributes.  Returns an empty object otherwise.
 * @param {Object} [target]
 * @returns {{'mfe.id': *, 'mfe.name': String}|{}}
 */
export function getMFEPayloadAttributes (target, agent) {
  if (!isValidMFETarget(target) || !agent) return {}
  return {
    'mfe.id': target.id,
    'mfe.name': target.name,
    eventSource: 'MicroFrontendBrowserAgent',
    'container.id': agent.runtime.appMetadata.agents[0].entityGuid
  }
}
