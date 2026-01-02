/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var stripNewlinesRegex = /^\n+|\n+$/g
var MAX_STACK_TRACE_LENGTH = 65530

export function formatStackTrace (stackLines) {
  return truncateStackLines(stackLines).replace(stripNewlinesRegex, '')
}

// takes array of stack lines and returns string with top 50 and buttom 50 lines
function truncateStackLines (stackLines) {
  var stackString
  if (stackLines.length > 100) {
    var truncatedLines = stackLines.length - 100
    stackString = stackLines.slice(0, 50).join('\n')
    stackString += '\n< ...truncated ' + truncatedLines + ' lines... >\n'
    stackString += stackLines.slice(-50).join('\n')
  } else {
    stackString = stackLines.join('\n')
  }
  return stackString
}

// truncates stack string to limit what is sent to backend
export function truncateSize (stackString) {
  return (stackString.length > MAX_STACK_TRACE_LENGTH) ? stackString.substr(0, MAX_STACK_TRACE_LENGTH) : stackString
}
