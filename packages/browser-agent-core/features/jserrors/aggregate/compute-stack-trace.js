/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
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
import { reduce } from '../../../common/util/reduce'
import {formatStackTrace} from './format-stack-trace'

var debug = false

var classNameRegex = /function (.+?)\s*\(/
var chrome = /^\s*at (?:((?:\[object object\])?(?:[^(]*\([^)]*\))*[^()]*(?: \[as \S+\])?) )?\(?((?:file|http|https|chrome-extension):.*?)?:(\d+)(?::(\d+))?\)?\s*$/i
var gecko = /^\s*(?:(\S*|global code)(?:\(.*?\))?@)?((?:file|http|https|chrome|safari-extension).*?):(\d+)(?::(\d+))?\s*$/i
var chrome_eval = /^\s*at .+ \(eval at \S+ \((?:(?:file|http|https):[^)]+)?\)(?:, [^:]*:\d+:\d+)?\)$/i
var ie_eval = /^\s*at Function code \(Function code:\d+:\d+\)\s*/i

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
    'mode': 'failed',
    'stackString': '',
    'frames': []
  }
}

/**
 * Computes stack trace information from the stack property.
 * Chrome and Gecko use this property.
 * @param {Error} ex
 * @return {?Object.<string, *>} Stack trace information.
 */
function computeStackTraceFromStackProp (ex) {
  if (!ex.stack) {
    return null
  }

  var errorInfo = reduce(
    ex.stack.split('\n'),
    parseStackProp,
    {frames: [], stackLines: [], wrapperSeen: false}
  )

  if (!errorInfo.frames.length) return null

  return {
    'mode': 'stack',
    'name': ex.name || getClassName(ex),
    'message': ex.message,
    'stackString': formatStackTrace(errorInfo.stackLines),
    'frames': errorInfo.frames
  }
}

function parseStackProp (info, line) {
  var element = getElement(line)

  if (!element) {
    info.stackLines.push(line)
    return info
  }

  if (isWrapper(element.func)) info.wrapperSeen = true
  else info.stackLines.push(line)

  if (!info.wrapperSeen) info.frames.push(element)
  return info
}

function getElement (line) {
  var parts = line.match(gecko)
  if (!parts) parts = line.match(chrome)

  if (parts) {
    return ({
      'url': parts[2],
      'func': (parts[1] !== 'Anonymous function' && parts[1] !== 'global code' && parts[1]) || null,
      'line': +parts[3],
      'column': parts[4] ? +parts[4] : null
    })
  }

  if (line.match(chrome_eval) || line.match(ie_eval) || line === 'anonymous') {
    return { 'func': 'evaluated code' }
  }
}

function computeStackTraceBySourceAndLine (ex) {
  if (!('line' in ex)) return null

  var className = ex.name || getClassName(ex)

  // Safari does not provide a URL for errors in eval'd code
  if (!ex.sourceURL) {
    return ({
      'mode': 'sourceline',
      'name': className,
      'message': ex.message,
      'stackString': getClassName(ex) + ': ' + ex.message + '\n    in evaluated code',
      'frames': [{
        'func': 'evaluated code'
      }]
    })
  }

  var stackString = className + ': ' + ex.message + '\n    at ' + ex.sourceURL
  if (ex.line) {
    stackString += ':' + ex.line
    if (ex.column) {
      stackString += ':' + ex.column
    }
  }

  return ({
    'mode': 'sourceline',
    'name': className,
    'message': ex.message,
    'stackString': stackString,
    'frames': [{ 'url': ex.sourceURL,
      'line': ex.line,
      'column': ex.column
    }]
  })
}

function computeStackTraceWithMessageOnly (ex) {
  var className = ex.name || getClassName(ex)
  if (!className) return null

  return ({
    'mode': 'nameonly',
    'name': className,
    'message': ex.message,
    'stackString': className + ': ' + ex.message,
    'frames': []
  })
}

function getClassName (obj) {
  var results = classNameRegex.exec(String(obj.constructor))
  return (results && results.length > 1) ? results[1] : 'unknown'
}

function isWrapper (functionName) {
  return (functionName && functionName.indexOf('nrWrapper') >= 0)
}
