/**
 * This function is responsible for determining if an error should be swallowed or not.
 * @param {Object} stackInfo - The error stack information.
 * @returns {boolean} - Whether the error should be swallowed or not.
 */
export function evaluateInternalError (stackInfo, internal) {
  const output = { shouldSwallow: internal || false, reason: 'Other' }
  const leadingFrame = stackInfo.frames?.[0]
  /** If we cant otherwise determine from the frames and message, the default of internal + reason will be the fallback */
  if (!leadingFrame || !stackInfo.message) return output
  // check for *specific* security policy errors from the newrelic-recorder or rrweb itself (for NPM), these are tied to browser APIs being disabled and are out of our control
  const isNrRecorder = leadingFrame?.url?.match(/nr-(.*)-recorder.min.js/)
  const isRrweb = leadingFrame?.url?.match(/rrweb/)
  if (!!isNrRecorder || !!isRrweb) {
    output.shouldSwallow = true
    output.reason = 'Rrweb'
    if (stackInfo.message.toLowerCase().match(/an attempt was made to break through the security policy of the user agent/)) output.reason += '-Security-Policy'
  }
  // other swallow conditions could also be added here
  return output
}
