/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { extractUrlsFromStack, getDeepStackTrace } from './script-tracker'
import { V2_TYPES } from './constants'

/**
 * @typedef {Object} V2Target
 * @property {'BA'} type always V2_TYPES.BA -- identifies this as the container (main) agent, not a registered MFE
 * @property {string} instance the container agent's agentIdentifier
 * @property {string} [id] the container agent's entity guid, once known (getter, resolved asynchronously)
 * @property {{[key:string]: any}} attributes the V2 payload attributes for the container agent (getter)
 */

/**
 * Determines if a given target represents a registered MFE (as opposed to the container agent).
 * @param {*} target the target to check
 * @returns {boolean} true if the target is a registered MFE target
 */
export function isMfeTarget (target) {
  return target?.type === V2_TYPES.MFE
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
 * Multiple registrations that resolve to the same underlying script asset AND represent the same logical MFE (i.e.
 * share the same customer-supplied `target.id`) are collapsed to a single target via
 * {@link dedupeRegisteredEntitiesByAsset}, since auto-instrumented events (AJAX, JS errors, logs, WebSockets) should
 * only be reported once per real occurrence when the same MFE was registered many times over -- not once per
 * duplicate registration. Distinct MFEs (different `target.id`) that happen to share a script (e.g. two different
 * MFEs both registered from the same inline `<script>` block) are intentionally NOT collapsed, since each is a
 * genuinely different entity that should still receive its own copy of the matched event.
 * @param {string} filename
 * @param {*} agentRef
 * @returns {import("../../interfaces/registered-entity").RegisterAPIMetadataTarget[]}
 */
export function getRegisteredTargetsFromFilename (filename, agentRef) {
  if (!isValid(filename, agentRef)) return []
  const registeredEntities = agentRef.runtime.registeredEntities
  const matches = registeredEntities?.filter(entity => entity.metadata.timings?.asset?.endsWith(filename))
  return dedupeRegisteredEntitiesByAsset(matches).map(entity => entity.metadata.target)
}

/**
 * Collapses a list of registered entities down to one canonical entity per unique, defined `metadata.timings.asset` +
 * `target.id` combination. Entities whose asset could not be resolved (undefined -- e.g. inline scripts or scripts
 * not found in the resource timing buffer) are never deduped against each other or against resolved entities, since
 * there is no signal that they represent the same underlying script. Entities that share an asset but have different
 * `target.id`s are never deduped against each other either, since a differing id means the customer registered
 * genuinely distinct MFEs (not duplicate registrations of the same one).
 *
 * Canonical selection per asset+id: prefer an entity whose target has not been deregistered (`target.blocked ===
 * false`) over one that has; otherwise the first-encountered entity wins, for determinism.
 * @param {Array} entities registered entities (each with `metadata.timings.asset` and `metadata.target`)
 * @returns {Array} deduped list of entities, preserving relative order of first occurrence
 */
export function dedupeRegisteredEntitiesByAsset (entities) {
  if (!entities?.length) return entities || []

  const byKey = new Map() // `${asset}::${id}` -> canonical entity
  const result = []

  for (const entity of entities) {
    const asset = entity.metadata?.timings?.asset
    if (!asset) {
      // can't safely dedupe unresolved-asset entities -- always keep as-is
      result.push(entity)
      continue
    }

    const key = `${asset}::${entity.metadata?.target?.id}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, entity)
      result.push(entity)
    } else if (existing.metadata.target?.blocked && !entity.metadata.target?.blocked) {
      // swap in a non-deregistered target as the canonical one for this asset+id
      const idx = result.indexOf(existing)
      if (idx !== -1) result[idx] = entity
      byKey.set(key, entity)
    }
    // else: existing canonical entity wins (already non-blocked, or both blocked -- first wins); drop this duplicate
  }

  return result
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
  /** if the target isn't a registered MFE, but we are in v2 mode, this means the data belongs to the container agent */
  if (!isMfeTarget(target)) return aggregateInstance.agentRef.runtime.v2Target.attributes
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
  return isMfeTarget(target) && !!supportsV2(aggregateInstance) && aggregateInstance.agentRef.init.api.register.duplicate_data_to_container
}

/**
 * Finds the registered targets from the stack trace for a given agent reference.
 * @param {*} agentRef The agent reference to use for finding targets.
 * @returns {Array} An array of targets found from the stack trace. If no targets are found or allowed, returns an array containing the container target.
 */
export function findTargetsFromStackTrace (agentRef) {
  if (!agentRef?.runtime) return []
  if (!isValid(true, agentRef) || !agentRef.runtime.registeredEntities?.length) return [agentRef.runtime.v2Target]

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

  const deduped = dedupeTargetsByInstance(targets)
  if (!deduped.length) deduped.push(agentRef.runtime.v2Target) // if we can't find any targets from the stack trace, the container agent is the target
  return deduped
}

/**
 * Removes duplicate targets from an array, keyed by `target.instance`. This guards against the same canonical
 * target re-entering the array via multiple matched stack-frame URLs (e.g. a recursive call whose stack contains the
 * same file at multiple depths). Multiple container-target entries (whose `instance` is the container agent's stable
 * `agentIdentifier`) naturally collapse to a single entry too, which is the desired behavior.
 * @param {Array} targets
 * @returns {Array} deduped list of targets, preserving relative order of first occurrence
 */
export function dedupeTargetsByInstance (targets) {
  const seen = new Set()
  const result = []
  for (const target of targets) {
    const key = target?.instance
    if (seen.has(key)) continue
    seen.add(key)
    result.push(target)
  }
  return result
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
