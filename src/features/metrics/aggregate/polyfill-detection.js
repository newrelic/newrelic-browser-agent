const detectionRegex = /\{ \[native code\] \}/
const POLYFILLS = {
  FUNCTION_BIND: 'Function.bind',
  FUNCTION_APPLY: 'Function.apply',
  FUNCTION_CALL: 'Function.call',
  ARRAY_INCLUDES: 'Array.includes',
  ARRAY_FROM: 'Array.from',
  ARRAY_FIND: 'Array.find',
  ARRAY_FLAT: 'Array.flat',
  ARRAY_FLATMAP: 'Array.flatMap',
  OBJECT_ASSIGN: 'Object.assign',
  OBJECT_ENTRIES: 'Object.entries',
  OBJECT_VALUES: 'Object.values',
  MAP: 'Map',
  SET: 'Set',
  WEAK_MAP: 'WeakMap',
  WEAK_SET: 'WeakSet'
}

/**
 * Checks for native globals to see if they have been polyfilled by customer code.
 * @returns {string[]} Array of methods that were detected to have been polyfilled
 */
export function getPolyfills () {
  const polyfills = []
  const mockFunction = function () { /* noop */ }
  try {
    if (typeof mockFunction.bind === 'function' && !detectionRegex.test(mockFunction.bind.toString())) polyfills.push(POLYFILLS.FUNCTION_BIND)
    if (typeof mockFunction.apply === 'function' && !detectionRegex.test(mockFunction.apply.toString())) polyfills.push(POLYFILLS.FUNCTION_APPLY)
    if (typeof mockFunction.call === 'function' && !detectionRegex.test(mockFunction.call.toString())) polyfills.push(POLYFILLS.FUNCTION_CALL)
    if (typeof [].includes === 'function' && !detectionRegex.test([].includes.toString())) polyfills.push(POLYFILLS.ARRAY_INCLUDES)
    if (typeof Array.from === 'function' && !detectionRegex.test(Array.from.toString())) polyfills.push(POLYFILLS.ARRAY_FROM)
    if (typeof [].find === 'function' && !detectionRegex.test([].find.toString())) polyfills.push(POLYFILLS.ARRAY_FIND)
    if (typeof [].flat === 'function' && !detectionRegex.test([].flat.toString())) polyfills.push(POLYFILLS.ARRAY_FLAT)
    if (typeof [].flatMap === 'function' && !detectionRegex.test([].flatMap.toString())) polyfills.push(POLYFILLS.ARRAY_FLATMAP)
    if (typeof Object.assign === 'function' && !detectionRegex.test(Object.assign.toString())) polyfills.push(POLYFILLS.OBJECT_ASSIGN)
    if (typeof Object.entries === 'function' && !detectionRegex.test(Object.entries.toString())) polyfills.push(POLYFILLS.OBJECT_ENTRIES)
    if (typeof Object.values === 'function' && !detectionRegex.test(Object.values.toString())) polyfills.push(POLYFILLS.OBJECT_VALUES)
    if (typeof Map === 'function' && !detectionRegex.test(Map.toString())) polyfills.push(POLYFILLS.MAP)
    if (typeof Set === 'function' && !detectionRegex.test(Set.toString())) polyfills.push(POLYFILLS.SET)
    if (typeof WeakMap === 'function' && !detectionRegex.test(WeakMap.toString())) polyfills.push(POLYFILLS.WEAK_MAP)
    if (typeof WeakSet === 'function' && !detectionRegex.test(WeakSet.toString())) polyfills.push(POLYFILLS.WEAK_SET)
  } catch (err) {
    // Possibly not supported
  }

  return polyfills
}
