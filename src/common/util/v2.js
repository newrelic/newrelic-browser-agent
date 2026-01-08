/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @enum {string}
 * @readonly
 */
export const V2_TYPES = {
  /** Micro Frontend */
  MFE: 'MFE',
  /** Browser Application */
  BA: 'BA'
}

/**
 * When given a valid target, returns an object with the V2 payload attributes.  Returns an empty object otherwise.
 * @note Field names may change as the schema is finalized
 *
 * @param {Object} [target] the registered target
 * @param {AggregateInstance} [aggregateInstance] the aggregate instance calling the method
 * @returns {Object} returns an empty object if args are not supplied or the aggregate instance is not supporting version 2
 */
export function getVersion2Attributes (target, aggregateInstance) {
  if (aggregateInstance?.harvestEndpointVersion !== 2) return {}
  const containerAgentEntityGuid = aggregateInstance.agentRef.runtime.appMetadata.agents[0].entityGuid
  /** if there's no target, but we are in v2 mode, this means the data belongs to the container agent */
  if (!target) {
    return {
      'entity.guid': containerAgentEntityGuid,
      appId: aggregateInstance.agentRef.info.applicationID
    }
  }
  /** otherwise, the data belongs to the target (MFE) and should be attributed as such */
  return {
    'source.id': target.id,
    'source.name': target.name,
    'source.type': target.type,
    'parent.id': target.parent?.id || containerAgentEntityGuid,
    'parent.type': target.parent?.type || V2_TYPES.BA
  }
}
