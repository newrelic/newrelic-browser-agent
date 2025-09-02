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
 * @param {Object} [target] the registered target
 * @param {AggregateInstance} [aggregateInstance] the aggregate instance calling the method
 * @returns {{'mfe.id': *, 'mfe.name': String}|{}} returns an empty object if args are not supplied or the aggregate instance is not supporting version 2
 */
export function getVersion2Attributes (target, aggregateInstance) {
  if (aggregateInstance?.harvestEndpointVersion !== 2) return {}
  const containerAgentEntityGuid = aggregateInstance.agentRef.runtime.appMetadata.agents[0].entityGuid
  if (!isValidMFETarget(target)) {
    return {
      'entity.guid': containerAgentEntityGuid
    }
  }
  return {
    'mfe.id': target.id,
    'mfe.name': target.name,
    eventSource: 'MicroFrontendBrowserAgent',
    'container.id': containerAgentEntityGuid
  }
}
