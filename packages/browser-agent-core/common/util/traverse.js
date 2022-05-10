// traverses an object and applies a fn to property values of a certain type
export function applyFnToProps(obj, fn, type, ignoreKeys) {
  if (!obj || typeof obj !== 'object') return obj
  type = type || 'string'
  ignoreKeys = ignoreKeys || []
  return traverse(obj)
  function traverse(obj) {
    for (var property in obj) {
      // eslint-disable-next-line
      if (obj.hasOwnProperty(property)) {
        if (typeof obj[property] === 'object') {
          traverse(obj[property])
        } else {
          if (typeof obj[property] === type && !shouldIgnore(property)) obj[property] = fn(obj[property])
        }
      }
    }
    return obj
  }

  function shouldIgnore(key) {
    var ignore = false
    for (var i = 0; i < ignoreKeys.length; i++) {
      if (ignoreKeys[i] === key) {
        ignore = true
        break
      }
    }
    return ignore
  }
}
