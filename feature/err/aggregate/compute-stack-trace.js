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
//   - Opera 10: full stack trace with line and column numbers
//   - Opera 9-: full stack trace with line numbers
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
//
// OPERA:
// ex.message = ...message... (see the example below)
// ex.name = ReferenceError
// ex.opera#sourceloc = 11  (pretty much useless, duplicates the info in ex.message)
// ex.stacktrace = n/a; see 'opera:config#UserPrefs|Exceptions Have Stacktrace'

var reduce = require('reduce')
var formatStackTrace = require('./format-stack-trace')

var has = Object.prototype.hasOwnProperty
var debug = false

var classNameRegex = /function (.+?)\s*\(/
var chrome = /^\s*at (?:((?:\[object object\])?(?:[^(]*\([^)]*\))*[^()]*(?: \[as \S+\])?) )?\(?((?:file|http|https|chrome-extension):.*?)?:(\d+)(?::(\d+))?\)?\s*$/i
var gecko = /^\s*(?:(\S*|global code)(?:\(.*?\))?@)?((?:file|http|https|chrome|safari-extension).*?):(\d+)(?::(\d+))?\s*$/i
var chrome_eval = /^\s*at .+ \(eval at \S+ \((?:(?:file|http|https):[^)]+)?\)(?:, [^:]*:\d+:\d+)?\)$/i
var ie_eval = /^\s*at Function code \(Function code:\d+:\d+\)\s*/i

module.exports = computeStackTrace

function computeStackTrace (ex) {
  var stack = null

  try {
    // This must be tried first because Opera 10 *destroys*
    // its stacktrace property if you try to access the stack
    // property first!!
    stack = computeStackTraceFromStacktraceProp(ex)
    if (stack) {
      return stack
    }
  } catch (e) {
    if (debug) {
      throw e
    }
  }

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
    stack = computeStackTraceFromOperaMultiLineMessage(ex)
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

/**
 * Computes stack trace information from the stacktrace property.
 * Opera 10 uses this property.
 * @param {Error} ex
 * @return {?Object.<string, *>} Stack trace information.
 */
function computeStackTraceFromStacktraceProp (ex) {
  if (!ex.stacktrace) {
    return null
  }

  // Access and store the stacktrace property before doing anything
  // else to it because Opera is not very good at providing it
  // reliably in other circumstances.
  var stacktrace = ex.stacktrace

  var testRE = / line (\d+), column (\d+) in (?:<anonymous function: ([^>]+)>|([^\)]+))\(.*\) in (.*):\s*$/i
  var lines = stacktrace.split('\n')
  var frames = []
  var stackLines = []
  var parts
  var wrapperSeen = false

  for (var i = 0, j = lines.length; i < j; i += 2) {
    if ((parts = testRE.exec(lines[i]))) {
      var element = {
        'line': +parts[1],
        'column': +parts[2],
        'func': parts[3] || parts[4],
        'url': parts[5]
      }

      if (isWrapper(element.func)) wrapperSeen = true
      else stackLines.push(lines[i])

      if (!wrapperSeen) frames.push(element)
    } else {
      stackLines.push(lines[i])
    }
  }

  if (!frames.length) {
    return null
  }

  return {
    'mode': 'stacktrace',
    'name': ex.name || getClassName(ex),
    'message': ex.message,
    'stackString': formatStackTrace(stackLines),
    'frames': frames
  }
}
/**
 * Computes stack trace information from an error message that includes
 * the stack trace.
 * Opera 9 and earlier use this method if the option to show stack
 * traces is turned on in opera:config.
 * @param {Error} ex
 * @return {?Object.<string, *>} Stack information.
 */
function computeStackTraceFromOperaMultiLineMessage (ex) {
  // Opera includes a stack trace into the exception message. An example is:
  //
  // Statement on line 3: Undefined variable: undefinedFunc
  // Backtrace:
  //   Line 3 of linked script file://localhost/Users/andreyvit/Projects/TraceKit/javascript-client/sample.js: In function zzz
  //         undefinedFunc(a)
  //   Line 7 of inline#1 script in file://localhost/Users/andreyvit/Projects/TraceKit/javascript-client/sample.html: In function yyy
  //           zzz(x, y, z)
  //   Line 3 of inline#1 script in file://localhost/Users/andreyvit/Projects/TraceKit/javascript-client/sample.html: In function xxx
  //           yyy(a, a, a)
  //   Line 1 of function script
  //     try { xxx('hi'); return false; } catch(ex) { TraceKit.report(ex); }
  //   ...

  var lines = ex.message.split('\n')
  if (lines.length < 4) {
    return null
  }

  var lineRE1 = /^\s*Line (\d+) of linked script ((?:file|http|https)\S+)(?:: in function (\S+))?\s*$/i
  var lineRE2 = /^\s*Line (\d+) of inline#(\d+) script in ((?:file|http|https)\S+)(?:: in function (\S+))?\s*$/i
  var lineRE3 = /^\s*Line (\d+) of function script\s*$/i
  var frames = []
  var stackLines = []
  var scripts = document.getElementsByTagName('script')
  var inlineScriptBlocks = []
  var parts
  var i
  var len
  var wrapperSeen = false

  for (i in scripts) {
    if (has.call(scripts, i) && !scripts[i].src) {
      inlineScriptBlocks.push(scripts[i])
    }
  }

  for (i = 2, len = lines.length; i < len; i += 2) {
    var item = null
    if ((parts = lineRE1.exec(lines[i]))) {
      item = {
        'url': parts[2],
        'func': parts[3],
        'line': +parts[1]
      }
    } else if ((parts = lineRE2.exec(lines[i]))) {
      item = {
        'url': parts[3],
        'func': parts[4]
      }
    } else if ((parts = lineRE3.exec(lines[i]))) {
      var url = window.location.href.replace(/#.*$/, '')
      var line = parts[1]

      item = {
        'url': url,
        'line': line,
        'func': ''
      }
    }

    if (item) {
      if (isWrapper(item.func)) wrapperSeen = true
      else stackLines.push(lines[i])

      if (!wrapperSeen) frames.push(item)
    }
  }
  if (!frames.length) {
    return null // could not parse multiline exception message as Opera stack trace
  }

  return {
    'mode': 'multiline',
    'name': ex.name || getClassName(ex),
    'message': lines[0],
    'stackString': formatStackTrace(stackLines),
    'frames': frames
  }
}
