/**
 * Interface for Agents' usage of the Window.sessionStorage as a replacement to third-party cookies.
 *  (All agents on a tab|window will share the same sessionStorage.)
 *
 * @design https://newrelic.atlassian.net/wiki/spaces/INST/pages/2522513791/JSESSIONID+Cookie+Change+Design+Document
 * @environment Browser script
 */
import { generateRandomHexString } from '../ids/unique-id';
import { isBrowserScope } from '../util/global-scope';

export { getCurrentSessionIdOrMakeNew };

const SESS_ID = 'NRBA_SESSION_ID'; // prevents potential key collisions in session storage

/**
 * @returns {string} This tab|window's session identifier, or a new ID if not found in storage
 */
function getCurrentSessionIdOrMakeNew() {
  if (!isBrowserScope) {
    return null;
  }

  try {
    let sessionId;
    if ((sessionId = window.sessionStorage.getItem(SESS_ID)) === null) {
      // Generate a new one if storage is empty (no previous ID was created or currently exists)
      sessionId = generateRandomHexString(16);
      window.sessionStorage.setItem(SESS_ID, sessionId);
    }
    return sessionId;
  } catch (ex) {
    // Session storage quota most likely 0mb and cannot be written to
    // OR the agent is running in a security context that does not allow
    // access to the browser sessionStorage
    return null;
  }
}

// In the future, we may expand sessionStorage to, say, auto-save some other agent data between page refreshes.
