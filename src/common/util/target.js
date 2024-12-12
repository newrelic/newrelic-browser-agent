/**
 * Checks if API targets are valid.  Undefined is valid because the fallback logic to the default will be applied.
 * Target can be undefined to support legacy/default behaviors where the target would never be supplied.  This can be overridden by setting the allowUndefined argument to false.
 * @param {Object=} target the target to be validated
 * @param {boolean=} allowUndefined defaults to true if not supplied
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
