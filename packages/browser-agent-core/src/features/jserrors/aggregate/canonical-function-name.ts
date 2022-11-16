/**
 * Not a complete function name regular expression but matching unicode characters
 * is not supported in all browsers and a valid regular expression would be next
 * to impossible to write and support ECMAScript spec. This is a rough attempt
 * at canonicalizing the function name.
 */
const canonicalFunctionNameRe = /([a-z0-9#_$]+)$/i;

/**
 * Trim down the provided function name.
 */
export function canonicalFunctionName(input: string): string | null {
  if (!input) {
    return null;
  }

  const match = input.trim().match(canonicalFunctionNameRe);
  if (Array.isArray(match) && match.length > 1) {
    return match[1];
  }

  return null;
}
