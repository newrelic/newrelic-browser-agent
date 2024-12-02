const REASON_RRWEB = 'Rrweb'
const REASON_SECURITY_POLICY = 'Security-Policy'
/**
 * This function is responsible for determining if an error should be swallowed or not.
 * @param {Object} stackInfo - The error stack information.
 * @returns {boolean} - Whether the error should be swallowed or not.
 */
export function evaluateInternalError (stackInfo, internal) {
  const output = { shouldSwallow: internal || false, reason: 'Other' }
  const leadingFrame = stackInfo.frames?.[0]
  /** If we cant otherwise determine from the frames and message, the default of internal + reason will be the fallback */
  if (!leadingFrame || typeof stackInfo?.message !== 'string') return output

  // check if the error happened in expected modules or if messages match known patterns
  const isNrRecorder = leadingFrame?.url?.match(/nr-(.*)-recorder.min.js/)
  const isRrweb = leadingFrame?.url?.match(/rrweb/)
  const isMaybeNrRecorder = leadingFrame?.url?.match(/recorder/)
  const isSecurityPolicyAPIError = stackInfo.message.toLowerCase().match(/an attempt was made to break through the security policy of the user agent/)

  // check if modules and patterns above fit known swallow cases
  if (!!isNrRecorder || !!isRrweb) {
    /** We know -for sure- that the error came from our recorder module or rrweb directly if these are true, so swallow it */
    output.shouldSwallow = true
    output.reason = REASON_RRWEB
    if (isSecurityPolicyAPIError) output.reason += '-' + REASON_SECURITY_POLICY
  } else if (!!isMaybeNrRecorder && isSecurityPolicyAPIError) {
    /** We -suspect- that the error came from NR, so if it matches the exact case we know about, swallow it */
    output.shouldSwallow = true
    output.reason = REASON_RRWEB + '-' + REASON_SECURITY_POLICY
  }
  // other swallow conditions could also be added here
  return output
}
