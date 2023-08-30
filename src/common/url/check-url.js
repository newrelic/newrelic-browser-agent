import { warn } from '../util/console'
/**
 * Checks input string to see if it's acceptable as agent's public path for loading source code.
 * @param {string} string - supposed url string
 * @param {boolean} [allowUnsecure] - when scheme isn't included in url string, this allows http: to be prepended if true
 * @returns Absolute url if 'string' is accepted. Empty string if it's denied.
 */
export function validateServerUrl (string, allowUnsecure = false) {
  if (!string || typeof string !== 'string') return ''

  if (string.indexOf(':/') !== -1) {
    if (!string.startsWith('https:')) { // when a scheme is specified,
      warn('Only HTTPS is allowed for the agent. Please check your configurations.')
      return ''
    }
  } else {
    if (string.startsWith('/')) {
      warn('Neither beacon nor assets URL can be a relative path. Please check your configurations.')
      return ''
    }
    string = allowUnsecure ? 'http://' + string : 'https://' + string // URL api requires a scheme or it'll throw
  }
  /* Note: URL API is not available in IE11 and throws in Safari v14- when base is undefined.
    Hence, this will always return empty string for those environments.
  */
  let properUrl
  try {
    properUrl = new URL(string)
  } catch (_) {
    return ''
  }
  // We want a url with scheme, domain, port, and path minus username|password or query; webpack concats this verbatim, so an ending slash is required
  let assetUrl = properUrl.origin + properUrl.pathname
  return assetUrl.endsWith('/') ? assetUrl : assetUrl + '/'
}
