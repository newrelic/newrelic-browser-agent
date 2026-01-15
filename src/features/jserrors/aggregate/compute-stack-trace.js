/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-useless-escape */

// computeStackTrace: cross-browser stack traces in JavaScript
//
// Syntax:
//   s = computeStackTrace(exception) // consider using TraceKit.report instead
// Returns:
//   s.name              - exception name
//   s.message           - exception message
//   s.stack[i].url      - JavaScript or HTML file URL
//   s.stack[i].func     - function name, or empty for anonymous functions
//   s.stack[i].line     - line number, if known
//   s.stack[i].column   - column number, if known
//   s.stack[i].context  - an array of source code lines; the middle element corresponds to the correct line#
//   s.mode              - 'stack', 'stacktrace', 'multiline', 'callers', 'onerror', or 'failed' -- method used to collect the stack trace
//
// Supports:
//   - Firefox:  full stack trace with line numbers and unreliable column
//               number on top frame
//   - Chrome:   full stack trace with line and column numbers
//   - Safari:   line and column number for the topmost stacktrace element
//               only
//   - IE:       no line numbers whatsoever

// Contents of Exception in various browsers.
//
// SAFARI:
// ex.message = Can't find variable: qq
// ex.line = 59
// ex.sourceId = 580238192
// ex.sourceURL = http://...
// ex.expressionBeginOffset = 96
// ex.expressionCaretOffset = 98
// ex.expressionEndOffset = 98
// ex.name = ReferenceError
//
// FIREFOX:
// ex.message = qq is not defined
// ex.fileName = http://...
// ex.lineNumber = 59
// ex.stack = ...stack trace... (see the example below)
// ex.name = ReferenceError
//
// CHROME:
// ex.message = qq is not defined
// ex.name = ReferenceError
// ex.type = not_defined
// ex.arguments = ['aa']
// ex.stack = ...stack trace...
//
// INTERNET EXPLORER:
// ex.message = ...
// ex.name = ReferenceError
import { formatStackTrace } from './format-stack-trace'
import { canonicalizeUrl } from '../../../common/url/canonicalize-url'

var debug = false

var classNameRegex = /function (.+?)\s*\(/
var chrome = /^\s*at (?:((?:\[object object\])?(?:[^(]*\([^)]*\))*[^()]*(?: \[as \S+\])?) )?\(?((?:file|http|https|chrome-extension):.*?)?:(\d+)(?::(\d+))?\)?\s*$/i
var gecko = /^\s*(?:(\S*|global code)(?:\(.*?\))?@)?((?:file|http|https|chrome|safari-extension).*?):(\d+)(?::(\d+))?\s*$/i
var chromeEval = /^\s*at .+ \(eval at \S+ \((?:(?:file|http|https):[^)]+)?\)(?:, [^:]*:\d+:\d+)?\)$/i
var ieEval = /^\s*at Function code \(Function code:\d+:\d+\)\s*/i

/**
 * Represents an error with a stack trace.
 * @typedef {Object} StackInfo
 * @property {string} name - The name of the error (e.g. 'TypeError').
 * @property {string} message - The error message.
 * @property {string} stackString - The stack trace as a string.
 * @property {Array<Object>} frames - An array of frames in the stack trace.
 * @property {string} frames.url - The URL of the file containing the code for the frame.
 * @property {string} frames.func - The name of the function associated with the frame.
 * @property {number} frames.line - The line number of the code in the frame.
 */

/**
 * Attempts to compute a stack trace for the given exception.
 * @param {Error} ex - The exception for which to compute the stack trace.
 * @returns {StackInfo} A stack trace object containing information about the frames on the stack.
 */
export function computeStackTrace (ex) {
  var stack = null

  try {
    stack = computeStackTraceFromStackProp(ex)
    if (stack) {
      return stack
    }
  } catch (e) {
    if (debug) {
      throw e
    }
  }

  try {
    stack = computeStackTraceBySourceAndLine(ex)
    if (stack) {
      return stack
    }
  } catch (e) {
    if (debug) {
      throw e
    }
  }

  try {
    stack = computeStackTraceWithMessageOnly(ex)
    if (stack) {
      return stack
    }
  } catch (e) {
    if (debug) {
      throw e
    }
  }

  return {
    mode: 'failed',
    stackString: '',
    frames: []
  }
}

/**
 * Computes stack trace information from the stack property. Chrome and Gecko use this property.
 *
 * @param {Error} ex - The error object to compute the stack trace for.
 * @return {?Object.<string, *>} Stack trace information.
 */
function computeStackTraceFromStackProp (ex) {
  if (!ex.stack) {
    return null
  }

  var errorInfo = ex.stack.split('\n').reduce(
    parseStackProp,
    { frames: [], stackLines: [], wrapperSeen: false }
  )

  if (!errorInfo.frames.length) return null

  return {
    mode: 'stack',
    name: ex.name || getClassName(ex),
    message: ex.message,
    stackString: formatStackTrace(errorInfo.stackLines),
    frames: errorInfo.frames
  }
}

/**
 * Parses a line from a JavaScript error stack trace and adds it to the given `info` object.
 * Ignores all stack entries thrown from one of our wrapper functions.
 *
 * @param {object} info - The `info` object to add the parsed line to.
 * @param {string} line - The line to parse.
 * @returns {object} The `info` object with the parsed line added.
 */
function parseStackProp (info, line) {
  let element = getStackElement(line)

  // This catches lines that aren't frames (like the first line stating the error).
  if (!element) {
    info.stackLines.push(line)
    return info
  }

  // Once we've seen a wrapper, ignore all subsequent stack entries.
  if (isNrWrapper(element.func)) info.wrapperSeen = true
  if (!info.wrapperSeen) {
    // Query strings and fragments should be removed, and URLs matching the loader's origin should be "<inline>".
    let canonicalUrl = canonicalizeUrl(element.url)
    if (canonicalUrl !== element.url) {
      line = line.replace(element.url, canonicalUrl)
      element.url = canonicalUrl
    }

    info.stackLines.push(line)
    info.frames.push(element)
  }

  return info
}

/**
 * Parses a line from a JavaScript error stack trace to extract information about a stack trace element, such as the
 * URL, function name, line number, and column number.
 *
 * @param {string} line - A single line from a JavaScript error stack trace.
 * @returns {object} An object containing information about the stack trace element, including the URL, function
 *     name, line number, and column number (if available).
 */
function getStackElement (line) {
  var parts = line.match(gecko)
  if (!parts) parts = line.match(chrome)

  if (parts) {
    return ({
      url: parts[2],
      func: (parts[1] !== 'Anonymous function' && parts[1] !== 'global code' && parts[1]) || null,
      line: +parts[3],
      column: parts[4] ? +parts[4] : null
    })
  }

  if (line.match(chromeEval) || line.match(ieEval) || line === 'anonymous') {
    return { func: 'evaluated code' }
  }
}

/**
 * Computes a stack trace object from an error object, by extracting the source and line number from the error object,
 * and using them to create a single stack frame.
 *
 * @param {Error} ex - The error object to compute the stack trace for.
 * @returns {Object|null} - An object representing the computed stack trace, or null if the
 * input error object does not contain a line number.
 */
function computeStackTraceBySourceAndLine (ex) {
  if (!('line' in ex)) return null

  var className = ex.name || getClassName(ex)

  // Safari does not provide a URL for errors in eval'd code
  if (!ex.sourceURL) {
    return ({
      mode: 'sourceline',
      name: className,
      message: ex.message,
      stackString: className + ': ' + ex.message + '\n    in evaluated code',
      frames: [{
        func: 'evaluated code'
      }]
    })
  }

  // Remove any query string and fragment
  var canonicalUrl = canonicalizeUrl(ex.sourceURL)

  var stackString = className + ': ' + ex.message + '\n    at ' + canonicalUrl
  if (ex.line) {
    stackString += ':' + ex.line
    if (ex.column) {
      stackString += ':' + ex.column
    }
  }

  return ({
    mode: 'sourceline',
    name: className,
    message: ex.message,
    stackString,
    frames: [{
      url: canonicalUrl,
      line: ex.line,
      column: ex.column
    }]
  })
}

/**
 * For exceptions with no stack and only a message, derives a stack trace by extracting the class name and message.
 *
 * @param {Error} ex - The exception for which to compute the stack trace.
 * @returns {StackTrace} A stack trace object containing the name and message of the exception.
 */
function computeStackTraceWithMessageOnly (ex) {
  var className = ex.name || getClassName(ex)
  if (!className) return null

  return ({
    mode: 'nameonly',
    name: className,
    message: ex.message,
    stackString: className + ': ' + ex.message,
    frames: []
  })
}

/**
 * Attempts to extract the name of the constructor function (the class) of the given object.
 *
 * @param {Object} obj - The object for which to extract the constructor function name.
 * @returns {string} The name of the constructor function, or 'unknown' if the name cannot be determined.
 */
function getClassName (obj) {
  var results = classNameRegex.exec(String(obj.constructor))
  return (results && results.length > 1) ? results[1] : 'unknown'
}

/**
 * Checks whether the given function name is a New Relic wrapper function.
 *
 * @param {string} functionName - The name of the function to check.
 * @returns {boolean} True if the function name includes the string 'nrWrapper', false otherwise.
 */
function isNrWrapper (functionName) {
  return (functionName && functionName.indexOf('nrWrapper') >= 0)
}
