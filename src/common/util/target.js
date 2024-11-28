/**
 * Checks if API targets are valid.  Undefined is valid because the fallback logic to the default will be applied.
 * Target can be undefined to support legacy/default behaviors where the target would never be supplied
 * @param {Object=} target
 * @returns {boolean}
 */
export function isValidTarget (target) {
  /** target can be undefined to support legacy/default behaviors */
  if (target === undefined) return true
  /** required values */
  if (!target?.licenseKey || !target?.applicationID) return false

  const keyCount = Object.keys(target).length
  if (target.entityGuid) return keyCount === 3
  else return keyCount === 2
}
