/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {Object} [target] - the target to be validated
 * @param {boolean} [allowUndefined=true]
 * @returns {boolean}
 */
export function isValidTarget (target, allowUndefined = true) {
  /** target can be undefined to support legacy/default behaviors */
  if (target === undefined && allowUndefined) return true
  /** required values */
  return !!target?.licenseKey && !!target?.applicationID
}

/**
 * Checks if the target matches the container agent target
 * @param {*} target the target to be validated
 * @param {*} agentRef the agent reference to be validated
 * @returns {boolean}
 */
export function isContainerAgentTarget (target, agentRef) {
  if (!target) return true
  return (target?.licenseKey === agentRef.info.licenseKey && target?.applicationID === agentRef.info.applicationID)
}
