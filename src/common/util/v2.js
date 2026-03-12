/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { extractUrlsFromStack, getDeepStackTrace } from './script-tracker'

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
 * Returns the registered target associated with a given ID. Returns undefined if not found.
 * @param {string|number} id
 * @param {*} agentRef the agent reference
 * @returns {import("../../interfaces/registered-entity").RegisterAPIMetadataTarget | undefined}
 */
export function getRegisteredTargetsFromId (id, agentRef) {
  if (!id || !agentRef?.init.api.allow_registered_children) return
  const registeredEntities = agentRef?.runtime.registeredEntities
  return registeredEntities?.filter(entity => String(entity.metadata.target.id) === String(id)).map(entity => entity.metadata.target) || []
}

/**
 * Returns the registered target(s) associated with a given filename if found in the resource timing API during registration. Returns an empty array if not found.
 * @param {string} filename
 * @param {*} agentRef
 * @returns {import("../../interfaces/registered-entity").RegisterAPIMetadataTarget[] | []}
 */
export function getRegisteredTargetsFromFilename (filename, agentRef) {
  if (!filename || !agentRef?.init.api.allow_registered_children) return []
  const registeredEntities = agentRef?.runtime.registeredEntities
  return registeredEntities?.filter(entity => entity.metadata.timings?.asset?.endsWith(filename)).map(entity => entity.metadata.target) || []
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
  return target.attributes
}

/**
 * Returns the attributes used for duplicating data in version 2 of the harvest endpoint. If not valid for duplication, returns an empty object.
 * @param {import("../../interfaces/registered-entity").RegisterAPIMetadataTarget} target
 * @param {*} aggregateInstance the aggregate instance calling the method
 * @returns {Object}
 */
export function getVersion2DuplicationAttributes (target, aggregateInstance) {
  if (aggregateInstance?.harvestEndpointVersion !== 2 || !shouldDuplicate(target, aggregateInstance?.agentRef)) return {}
  return { 'child.id': target.id, 'child.type': target.type }
}

export function shouldDuplicate (target, agentRef) {
  return !!target && agentRef.init.api.duplicate_registered_data
}

export function findTargetsFromStackTrace (agentRef) {
  if (!agentRef?.init.api.allow_registered_children) return []

  let iterator = 0
  const targets = []
  try {
    var urls = extractUrlsFromStack(getDeepStackTrace()).reverse()
    while (urls[iterator]) {
      targets.push(...getRegisteredTargetsFromFilename(urls[iterator++], agentRef))
    }
  } catch (err) {
    // Silent catch to prevent errors from propagating
  }
  return targets
}
