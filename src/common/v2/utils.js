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
 * Returns a single registered entity associated with a given iframe interface ID. Returns undefined if no entity is found.
 * @param {string} iframeInterfaceId
 * @param {*} agentRef the agent reference
 * @returns {import("../../loaders/api/register-api-types").RegisterAPI|undefined}
 */
export function getRegisteredEntityByIframeInterfaceId (iframeInterfaceId, agentRef) {
  if (!isValid(iframeInterfaceId, agentRef)) return undefined
  const registeredEntities = agentRef.runtime.registeredEntities
  return registeredEntities?.find(entity => entity.metadata.target.iframeInterfaceId === iframeInterfaceId)
}

/**
 * Returns the registered target associated with a given ID. Returns an empty array if no target is found.
 * @param {string|number} id
 * @param {*} agentRef the agent reference
 * @returns {import("../../interfaces/registered-entity").RegisterAPIMetadataTarget[]}
 */
export function getRegisteredTargetsFromId (id, agentRef) {
  if (!isValid(id, agentRef)) return []
  const registeredEntities = agentRef.runtime.registeredEntities
  return registeredEntities?.filter(entity => String(entity.metadata.target.id) === String(id)).map(entity => entity.metadata.target) || []
}

/**
 * Returns the registered target(s) associated with a given filename if found in the resource timing API during registration. Returns an empty array if no target is found.
 * @param {string} filename
 * @param {*} agentRef
 * @returns {import("../../interfaces/registered-entity").RegisterAPIMetadataTarget[]}
 */
export function getRegisteredTargetsFromFilename (filename, agentRef) {
  if (!isValid(filename, agentRef)) return []
  const registeredEntities = agentRef.runtime.registeredEntities
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
  if (!supportsV2(aggregateInstance)) return {}
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
 * Returns the attributes used for duplicating data in version 2 of the harvest endpoint.
 * If not valid for duplication, returns an empty object.
 * @note BEST PRACTICE - Caller should call shouldDuplicate() before utilizing this method to determine if duplication attributes should be added to the event.
 * @param {import("../../interfaces/registered-entity").RegisterAPIMetadataTarget} target
 * @param {*} aggregateInstance the aggregate instance calling the method
 * @returns {Object}
 */
export function getVersion2DuplicationAttributes (target, aggregateInstance) {
  if (!shouldDuplicate(target, aggregateInstance)) return {}
  return { 'child.id': target.id, 'child.type': target.type, ...getVersion2Attributes(undefined, aggregateInstance) }
}

/**
 * Determines if an event should be duplicated for a given target and aggregate instance.  This is used to determine if duplication attributes should be added to an event and if the event should be sent to the soft nav feature for evaluation.
 * @note This method is intended to be used in conjunction with getVersion2DuplicationAttributes and should be called before it to determine if duplication attributes should be added to an event.
 * @param {import("../../interfaces/registered-entity").RegisterAPIMetadataTarget} target
 * @param {*} aggregateInstance The aggregate instance calling the method.  This is needed to check if duplication is enabled and if the harvest endpoint version supports it.
 * @returns {boolean} returns true if the event should be duplicated for the target, false otherwise
 */
export function shouldDuplicate (target, aggregateInstance) {
  return !!target && !!supportsV2(aggregateInstance) && aggregateInstance.agentRef.init.api.register.duplicate_data_to_container
}

/**
 * Finds the registered targets from the stack trace for a given agent reference.
 * @param {*} agentRef The agent reference to use for finding targets.
 * @returns {Array} An array of targets found from the stack trace. If no targets are found or allowed, returns an array with undefined.
 */
export function findTargetsFromStackTrace (agentRef) {
  if (!isValid(true, agentRef)) return [undefined]

  const targets = []
  try {
    var urls = extractUrlsFromStack(getDeepStackTrace())
    let iterator = urls.length - 1
    while (urls[iterator]) {
      targets.push(...getRegisteredTargetsFromFilename(urls[iterator--], agentRef))
    }
  } catch (err) {
    // Silent catch to prevent errors from propagating
  }
  if (!targets.length) targets.push(undefined) // if we can't find any targets from the stack trace, return an array with undefined to signify the container agent is the target
  return targets
}

/**
 * Determines if the aggregate instance supports version 2 of the harvest endpoint. Nearly all the V2 logic "depends" on
 * the harvest endpoint version, so this is the main gatekeeper method for whether or not V2 logic should be executed across the
 * various functions in this module.
 * @param {*} aggregateInstance The aggregate instance to check.
 * @returns {boolean} Returns true if the aggregate instance supports version 2, false otherwise.
 */
function supportsV2 (aggregateInstance) {
  return aggregateInstance?.harvestEndpointVersion === 2
}

/**
 * Determines if the given identifier and agent reference are valid for use for entity lookups and other operations in the utils methods. This is a common check that is used across multiple methods in this module to ensure that the necessary data is present and that the register API is enabled before attempting to perform operations that depend on those things.
 * @param {*} identifier The identifier to check.
 * @param {*} agentRef The agent reference to check.
 * @returns {boolean} Returns true if the identifier and agent reference are valid, false otherwise.
 */
function isValid (identifier, agentRef) {
  return !!identifier && !!agentRef?.init.api.register.enabled
}
