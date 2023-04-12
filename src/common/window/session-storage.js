/**
 * Interface for Agents' usage of the Window.sessionStorage as a replacement to third-party cookies.
 *  (All agents on a tab|window will share the same sessionStorage.)
 *
 * @design https://newrelic.atlassian.net/wiki/spaces/INST/pages/2522513791/JSESSIONID+Cookie+Change+Design+Document
 * @environment Browser script
 */
import { generateRandomHexString } from '../ids/unique-id'

const AGENT_PREFIX = 'NRBA/'

/**
 * @param {string} key
 * @param {string} value
 * @returns true, if item was set successfully. false, if storage is full or setItem threw an exception.
 */
export function putInBrowserStorage (key, value, subgroup = '') {
  try {
    window.sessionStorage.setItem(AGENT_PREFIX + subgroup + key, value)
    return true
  } catch (ex) {
    // Session storage may be full.
    return false
  }
}
/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Storage/getItem}
 * @param {string} key
 */
function getFromBrowserStorage (key, subgroup = '') {
  return window.sessionStorage.getItem(AGENT_PREFIX + subgroup + key)
}
export function removeFromBrowserStorage (key, subgroup = '') {
  try {
    window.sessionStorage.removeItem(AGENT_PREFIX + subgroup + key)
  } catch (e) {}
}

/**
 * @returns {string} This tab|window's session identifier, or a new ID if not found in storage
 */
export function getCurrentSessionIdOrMakeNew () {
  try {
    let sessionId
    if ((sessionId = getFromBrowserStorage('SESSION_ID')) === null) {
      // Generate a new one if storage is empty (no previous ID was created or currently exists)
      sessionId = generateRandomHexString(16)
      putInBrowserStorage('SESSION_ID', sessionId)
    }
    return sessionId
  } catch (ex) {
    // The agent is running in a security context that does not allow access to the sessionStorage or is not in browser window context.
    return null
  }
}

/**
 * Look through the page's sessionStorage items and gather the ones that was set under some grouping label, if applicable.
 * @param {string} [subgroup] - empty string by default, which will return all items set by browser agent
 * @returns An object of the key-value items from putInBrowserStorage calls from agents with access to the same storage space.
 */
export function getAllStorageItemsOfGroup (subgroup = '') {
  const prefixFilter = AGENT_PREFIX + subgroup
  const groupItems = {}
  try {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      let key = window.sessionStorage.key(i)
      if (!key.startsWith(prefixFilter)) continue
      else key = key.slice(prefixFilter.length) // this removes the "NRBA/<subgroup>" prefix so we get back the original key putInBrowserStorage

      groupItems[key] = getFromBrowserStorage(key, subgroup)
    }
  } catch (ex) { }
  return groupItems
}
