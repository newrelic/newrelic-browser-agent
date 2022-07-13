/**
 * Interface for Agents' usage of the Window.sessionStorage as a replacement to third-party cookies.
 *  (All agents on a tab|window will share the same sessionStorage.)
 * 
 * @documentation https://newrelic.atlassian.net/wiki/spaces/INST/pages/2522513791/JSESSIONID+Cookie+Change+Design+Document
 * @environment Browser script
 */
import { generateRandomHexString } from '../ids/unique-id'

export { getCurrentSessionId };

const ss = window.sessionStorage;
const SESS_ID = Symbol("session id").toString(); // prevents potential key collisions in session storage

/**
 * @returns {string} This tab|window's session identifier, or a new ID if not found in storage
 */
function getCurrentSessionId() {
  let sessionId;
  if ((sessionId = ss.getItem(SESS_ID)) === null) {  // it's possible that the ID is (was previously set to) 0
    sessionId = generateRandomHexString(16);
    ss.setItem(SESS_ID, sessionId);
  }
  return sessionId;
}

// In the future, we may expand sessionStorage to, say, auto-save some other agent data between page refreshes.