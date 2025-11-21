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

export function hasValidValue (val) {
  return (typeof val === 'string' && val.trim().length < 501) || (typeof val === 'number')
}

/**
 * When given a valid target, returns an object with the MFE payload attributes.  Returns an empty object otherwise.
 * @note Field names may change as the schema is finalized
 *
 * @param {Object} [target] the registered target
 * @param {AggregateInstance} [aggregateInstance] the aggregate instance calling the method
 * @returns {{'mfe.id': *, 'mfe.name': String}|{}} returns an empty object if args are not supplied or the aggregate instance is not supporting version 2
 */
export function getVersion2Attributes (target, aggregateInstance) {
  /** If the feature doesnt support registered entities (V2), no need to add any attributes at all */
  if (!aggregateInstance.supportsRegisteredEntities) return {}
  const containerAgentEntityGuid = aggregateInstance?.agentRef.runtime.appMetadata.agents[0].entityGuid
  /** If the target in question is not an MFE (container), or its "blocked" (feature flag or register issue), just report it to the container */
  if (!isValidMFETarget(target) || target.blocked) {
    return {
      'entity.guid': containerAgentEntityGuid,
      appId: aggregateInstance.agentRef.info.applicationID
    }
  }
  /** decorate for MFE */
  return {
    'mfe.id': target.id,
    'mfe.name': target.name,
    eventSource: target.eventSource,
    'parent.id': target.parent?.id || containerAgentEntityGuid
  }
}
