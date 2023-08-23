export function isValidAssetUrl (string) {
  /* Note: This API is not available in IE11 and throws in Safari v14- when base is undefined.
    Hence, this will always return false for those environments.
  */
  try {
    let url = new URL(string)
  } catch (_) {
    return false
  }
  if (!string.endsWith('/')) return false // webpack concats base verbatim so this is a stringent req
  return true
}
