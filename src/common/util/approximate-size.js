/**
 * Calculates the approximate size of a given object if it were to be serialized, including all nested properties.
 * Estimates size but for the sake of speed does not stringify or otherwise serialize the object.
 *
 * @param {Object} object - The object for which size will be calculated.
 * @returns {number} The approximate size of the object.
 */
export function approximateSize (object) {
  const seen = new WeakSet()
  const stack = [object]
  let size = 0
  while (stack.length) {
    try {
      const value = stack.pop()
      if (value === null || value === true) size += 4
      else if (value === false) size += 5
      else if (typeof value === 'string') size += value.length + 2 // + ""
      else if (typeof value === 'number') size += String(value).length
      else if (value instanceof Date) size += 26 // ISO format + ""
      else if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer && value.byteLength) size += value.byteLength // naive estimate
      else if (typeof Blob !== 'undefined' && value instanceof Blob && value.size) size += value.size // naive estimate
      else if (typeof value === 'object' && !seen.has(value)) {
        // assuming zero bytes for circular values (but does count the key)
        seen.add(value)
        size += 2 // [] or {}
        let commas = -1
        if (Array.isArray(value)) { // arrays and other iterables
          for (const v of value) {
            stack.push(v)
            commas++
          }
        } else {
          const keys = Object.keys(value)
          if (keys && keys.length) {
            keys.forEach(k => {
              size += k.length + 3 // "":
              stack.push(value[k])
              commas++
            })
          }
        }
        if (commas > 0) size += commas
      }
    } catch (_) {
      continue
    }
  }

  return size
}
