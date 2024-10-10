/**
 * This function is responsible for determining if an error should be swallowed or not.
 * @param {Object} stackInfo - The error stack information.
 * @returns {boolean} - Whether the error should be swallowed or not.
 */
export function isInternalError (stackInfo, internal) {
  let shouldSwallow = internal || false
  let reason = 'Other'
  // check for *specific* security policy errors from the newrelic-recorder or rrweb itself (for NPM), these are tied to browser APIs being disabled and are out of our control
  const isNrRecorder = stackInfo.frames?.[0].match(/nr-(.*)-recorder.min.js/)
  const isRrweb = stackInfo.frames?.[0].match(/rrweb/)
  if ((!!isNrRecorder || !!isRrweb) && !!stackInfo.message.toLowerCase().match(/an attempt was made to break through the security policy of the user agent/)) {
    reason = 'Rrweb'
    shouldSwallow = true
  }
  // other swallow conditions could also be added here

  return { shouldSwallow, reason }
}
