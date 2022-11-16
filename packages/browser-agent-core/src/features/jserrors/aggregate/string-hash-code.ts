/**
 * Hashes an input string into a 32bit integer using bitwise operations for performance.
 */
export function stringHashCode(input: string): number {
  if (typeof input !== "string" || input.length === 0) {
    return 0;
  }

  let hash = 0;

  for (var i = 0; i < input.length; i++) {
    const charVal = input.charCodeAt(i);
    hash = (hash << 5) - hash + charVal;
    hash = hash | 0; // Convert to 32bit integer
  }

  return hash;
}
