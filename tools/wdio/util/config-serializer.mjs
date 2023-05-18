/**
 * Indicates the type of input being processed during a recursive
 * call to the {@link serializer} method.
 */
const recursiveCallTypes = {
  OBJECT: 'object',
  ARRAY: 'array'
}

/**
 * Serializes the input config object to produce a string that can be write and executed as JavaScript.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
 * @param {any} input WDIO config object
 * @returns {string|undefined} Serialized version of input
 */
export function serialize (input) {
  return serializer(input)
}

/**
 * Serializes the input and supports maintaining state between recursive calls. When
 * serializing arrays and objects, this method will be called multiple times while
 * traversing the array or object.
 * @param {any} input Any input that needs to be serialized
 * @param {recursiveCallTypes} recursiveCallType Indicates what type of input is being
 * serialized when in a recursive call.
 */
function serializer (input, recursiveCallType, seen = new WeakSet()) {
  let result = ''

  if (typeof input === 'function') {
    result = input.toString()
  } else if (input === undefined) {
    result = 'undefined'
  } else if (input === null) {
    result = 'null'
  } else if (typeof input === 'string' || input instanceof String) {
    result = `"${input}"`
  } else if (
    (typeof input === 'number' || input instanceof Number) ||
    (typeof input === 'boolean' || input instanceof Boolean)
  ) {
    result = input
  } else if (input instanceof Date) {
    result = '"' + input.toISOString() + '"'
  } else if (Array.isArray(input)) {
    seen.add(input)
    result += '['

    for (const entry of input) {
      let isCircular = false
      if (entry && typeof entry === 'object') {
        if (seen.has(entry)) {
          isCircular = true
        } else {
          seen.add(entry)
        }
      }

      let childSerializer
      if (!isCircular) {
        childSerializer = serializer(entry, recursiveCallTypes.ARRAY)
      } else {
        childSerializer = '"[circular reference]"'
      }

      if (childSerializer) {
        if (result.length > 1) {
          result += ','
        }

        result += childSerializer
      }
    }

    result += ']'
  } else if (typeof input === 'object') {
    seen.add(input)
    result += '{'

    for (const [key, value] of Object.entries(input)) {
      let isCircular = false
      if (value && typeof value === 'object') {
        if (seen.has(value)) {
          isCircular = true
        } else {
          seen.add(value)
        }
      }

      let childSerializer
      if (!isCircular) {
        childSerializer = serializer(value, recursiveCallTypes.OBJECT)
      } else {
        childSerializer = '"[circular reference]"'
      }

      if (childSerializer) {
        if (result.length > 1) {
          result += ','
        }

        result += '"' + key + '":' + childSerializer
      }
    }

    result += '}'
  }

  return result
}
