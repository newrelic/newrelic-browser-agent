/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const canonicalFunctionNameRe = /([a-z0-9]+)$/i

/**
 * Given a function name string, extracts only an alphanumeric segment at the end of the string (if one exists).
 * This is useful for stack traces, where functions might not be named (e.g., anonymous, computed).
 *
 * @param {string} functionNameString - The original function name string.
 * @returns {string|undefined} The canonical function name, or undefined if the input is falsy or no alphanumeric segments are found.
 */
export function canonicalFunctionName (functionNameString) {
  if (!functionNameString) return

  const match = functionNameString.match(canonicalFunctionNameRe)
  if (match) return match[1]
}
