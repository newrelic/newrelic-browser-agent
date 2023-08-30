/**
 * Checks input string to see if it's acceptable as agent's public path for loading source code.
 * @param {string} string - supposed url string
 * @returns Absolute url if 'string' is accepted. Empty string if it's denied.
 */
export function validateAssetUrl (string) {
  if (!string || typeof string !== 'string') return ''

  if (string.indexOf(':/') !== -1) {
    if (!string.startsWith('http')) return '' // non http schemes, such as ftp, are not allowed to be an asset source
  } else { // there's no scheme on this supposed URL, so we'll assume https -- the api will require a scheme.
    if (string.startsWith('/')) return '' // no relative paths...
    string = 'https://' + string
  }
  /* Note: URL API is not available in IE11 and throws in Safari v14- when base is undefined.
    Hence, this will always return empty string for those environments.
  */
  let properUrl
  try {
    properUrl = new URL(string)
    properUrl.protocol = 'https:' // enforce HTTPS over HTTP
  } catch (_) {
    return ''
  }
  // We want a url with scheme, domain, port, and path minus username|password or query; webpack concats this verbatim, so an ending slash is required
  let assetUrl = properUrl.origin + properUrl.pathname
  return assetUrl.endsWith('/') ? assetUrl : assetUrl + '/'
}
