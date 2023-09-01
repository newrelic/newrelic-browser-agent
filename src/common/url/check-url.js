/* eslint-disable no-throw-literal */
import { warn } from '../util/console'

/**
 * Checks input string to see if it's acceptable as agent's public path for loading source code.
 * @param {string} string - supposed url string
 * @param {boolean} [allowUnsecure] - when scheme isn't included in url string, this allows http: to be prepended if true
 * @returns Absolute url if 'string' is accepted. Empty string if it's denied.
 */
export function validateServerUrl (string, allowUnsecure = false) {
  if (!string || typeof string !== 'string') return ''

  let properUrl
  try {
    if (string.indexOf(':/') !== -1) { // when a scheme is specified (new style)
      if (!string.startsWith('https:')) throw 'Only HTTPS is allowed for the agent. Please check your configurations.'
    } else {
      if (string.startsWith('/')) throw 'Neither beacon nor assets URL can be a relative path. Please check your configurations.'
      string = allowUnsecure ? 'http://' + string : 'https://' + string // URL api requires a scheme or it'll throw
    }
    /* Note: URL API is not available in IE11 and throws in Safari v14- when base is undefined. Hence, this will always return empty string for those environments.
    As it turns out, proper URL validation is a complex problem, and even the URL api doesn't (can't) do it correctly. https://snyk.io/blog/secure-javascript-url-validation/
    As such, we have to check the domain ourselves for illegal characters -- it should only allow numbers|letters|hyphen and the dot for subdomains
    */
    properUrl = new URL(string)
    if (!/^[A-Za-z0-9.-]+$/.test(properUrl.hostname)) throw 'Bad hostname detected for url. Please check your configurations.'
  } catch (e) {
    warn(e)
    return ''
  }
  // We want a url with scheme, domain, port, and path minus username|password or query; webpack concats this verbatim, so an ending slash is required
  let assetUrl = properUrl.origin + properUrl.pathname
  return assetUrl.endsWith('/') ? assetUrl : assetUrl + '/'
}
