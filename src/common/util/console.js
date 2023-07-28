/**
 * A helper method to log to the console with New Relic: decoration
 * @param {string} message - The primary message to warn
 * @param {*} secondary - Secondary data to include, usually an error or object
 * @returns
 */
export function log (message, secondary) {
  if (typeof console.log !== 'function') return
  console.log(`New Relic: ${message}`)
  if (secondary) console.log(secondary)
}

/**
 * A helper method to warn to the console with New Relic: decoration
 * @param {string} message - The primary message to warn
 * @param {*} secondary - Secondary data to include, usually an error or object
 * @returns
 */
export function warn (message, secondary) {
  if (typeof console.warn !== 'function') return
  console.warn(`New Relic: ${message}`)
  if (secondary) console.warn(secondary)
}
