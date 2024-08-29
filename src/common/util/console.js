/* eslint no-console: ["error", { allow: ["debug"] }] */

/**
 * A helper method to warn to the console with New Relic: decoration
 * @param {string} message The primary message to warn
 * @param {*} [secondary] Secondary data to include, usually an error or object
 * @returns
 */
export function warn (code, secondary) {
  if (typeof console.debug !== 'function') return
  console.debug(`New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#${code}`, secondary)
}
