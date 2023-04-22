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
    const value = stack.pop()
    if (value === null || value === true) size += 4
    else if (value === false) size += 5
    else if (typeof value === 'string') size += value.length + 2 // + ""
    else if (typeof value === 'number') size += String(value).length
    else if (value instanceof Date) size += 26 // ISO format + ""
    else if (typeof value === 'object' && !seen.has(value)) {
      // assuming zero bytes for circular values (but does count the key)
      seen.add(value)
      if (Array.isArray(value)) { // arrays and other iterables
        size += 2 // []
        let commas = -1
        for (const v of value) {
          stack.push(v)
          commas++
        }
        if (commas > 0) size += commas
      } else {
        const keys = Object.keys(value)
        if (keys && keys.length) {
          size += 2 // {}
          let commas = -1
          keys.forEach(k => {
            size += k.length + 3 // "":
            stack.push(value[k])
            commas++
          })
          if (commas > 0) size += commas
        } else size += 2 // {}
      }
    }
  }

  return size
}
