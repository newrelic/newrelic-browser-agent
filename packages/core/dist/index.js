(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["nrBrowserCore"] = factory();
	else
		root["nrBrowserCore"] = factory();
})(self, function() {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 283:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ieVersion": () => (/* binding */ ieVersion)
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var div = document.createElement('div')

div.innerHTML = '<!--[if lte IE 6]><div></div><![endif]-->' +
  '<!--[if lte IE 7]><div></div><![endif]-->' +
  '<!--[if lte IE 8]><div></div><![endif]-->' +
  '<!--[if lte IE 9]><div></div><![endif]-->'

var len = div.getElementsByTagName('div').length

var ieVersion
if (len === 4) ieVersion = 6
else if (len === 3) ieVersion = 7
else if (len === 2) ieVersion = 8
else if (len === 1) ieVersion = 9
else ieVersion = 0


/***/ }),

/***/ 756:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getConfiguration": () => (/* binding */ getConfiguration),
/* harmony export */   "getConfigurationValue": () => (/* binding */ getConfigurationValue),
/* harmony export */   "getInfo": () => (/* binding */ getInfo),
/* harmony export */   "getLoaderConfig": () => (/* binding */ getLoaderConfig),
/* harmony export */   "originals": () => (/* binding */ originalMethods),
/* harmony export */   "runtime": () => (/* binding */ runtimeConfiguration),
/* harmony export */   "setConfiguration": () => (/* binding */ setConfiguration),
/* harmony export */   "setConfigurationValue": () => (/* binding */ setConfigurationValue),
/* harmony export */   "setInfo": () => (/* binding */ setInfo),
/* harmony export */   "setLoaderConfig": () => (/* binding */ setLoaderConfig)
/* harmony export */ });
/* harmony import */ var _window_nreum__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(453);
/* harmony import */ var _browser_version_ie_version__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(283);
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */




var originalMethods = (0,_window_nreum__WEBPACK_IMPORTED_MODULE_0__/* .gosNREUMOriginals */ .mF)().o

var runtimeConfiguration = {
  origin: '' + window.location,
  maxBytes: _browser_version_ie_version__WEBPACK_IMPORTED_MODULE_1__.ieVersion === 6 ? 2000 : 30000
}

var info = {beacon: _window_nreum__WEBPACK_IMPORTED_MODULE_0__/* .defaults.beacon */ .ce.beacon, errorBeacon: _window_nreum__WEBPACK_IMPORTED_MODULE_0__/* .defaults.errorBeacon */ .ce.errorBeacon}
var init = {}
var loader_config = {}





function getConfiguration() {
  return init
}

function setConfiguration(configuration) {
  init = configuration
}

function getConfigurationValue(path) {
  var val = init
  var parts = path.split('.')
  for (var i = 0; i < parts.length - 1; i++) {
    val = val[parts[i]]
    if (typeof val !== 'object') return
  }
  val = val[parts[parts.length - 1]]
  console.log("val...(",path,")", val)
  return val
}

function setConfigurationValue(path, newValue) {
  var val = init
  var parts = path.split('.')
  for (var i = 0; i < parts.length - 1; i++) {
    if (typeof val[parts[i]] === 'undefined') {
      val[parts[i]] = {}
    }
    val = val[parts[i]]
  }
  val[parts[parts.length - 1]] = newValue
}

function getInfo() {
  // if (window.NREUM && window.NREUM.info) {
  //   return window.NREUM.info
  // }
  // return {}
  return info
}

function setInfo(obj) {
  // no longer global
  // window.NREUM = window.NREUM || {}
  // window.NREUM.info = info = window.NREUM.info || {}

  if (obj.licenseKey) {
    info.licenseKey = obj.licenseKey
  }

  if (obj.beaconUrl) {
    info.beacon = obj.beaconUrl
    info.errorBeacon = obj.beaconUrl
  }

  if (obj.beacon) {
    info.beacon = obj.beacon
  }

  if (obj.errorBeacon) {
    info.errorBeacon = obj.errorBeacon
  }

  if (obj.appId) {
    info.applicationID = obj.appId
  }

  if (obj.applicationID) {
    info.applicationID = obj.applicationID
  }

  // TODO: there are others
}

function getLoaderConfig() {
  // if (window.NREUM && window.NREUM.info) {
  //   return window.NREUM.info
  // }
  // return {}
  return loader_config
}

function setLoaderConfig(obj) {
  loader_config = obj

  // TODO: clean up
}

/***/ }),

/***/ 960:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "m": () => (/* binding */ PATH),
/* harmony export */   "q": () => (/* binding */ VERSION)
/* harmony export */ });
const PATH = !!process && "test/" || ''
const VERSION = !!process && "1216" ? `-${"1216"}`: ''


/***/ }),

/***/ 75:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "C": () => (/* binding */ globalInstance),
/* harmony export */   "c": () => (/* binding */ getOrSetContext),
/* harmony export */   "ee": () => (/* binding */ baseEE)
/* harmony export */ });
/* harmony import */ var _window_nreum__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(453);
/* harmony import */ var _util_get_or_set__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(995);
/* harmony import */ var _util_map_own__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(343);
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */





var ctxId = 'nr@context'

// create global emitter instance that can be shared among bundles
let nr = (0,_window_nreum__WEBPACK_IMPORTED_MODULE_0__/* .gosNREUM */ .fP)()
var globalInstance
if (nr.ee) {
  globalInstance = nr.ee
} else {
  globalInstance = ee(undefined, 'globalEE')
  nr.ee = globalInstance
}

// export default ee()
var baseEE = ee(undefined, 'baseEE')





function EventContext () {}

function ee (old, debugId) {
  console.log("ee! old, debug", old, debugId)
  var handlers = {}
  var bufferGroupMap = {}
  var emitters = {}

  var emitter = {
    on: addEventListener,
    addEventListener: addEventListener,
    removeEventListener: removeEventListener,
    emit: emit,
    get: getOrCreate,
    listeners: listeners,
    context: context,
    buffer: bufferEventsByGroup,
    abort: abortIfNotLoaded,
    aborted: false,
    isBuffering: isBuffering,
    debugId
  }

  // buffer is associated with a base emitter, since there are two
  // (global and scoped to the current bundle), it is now part of the emitter
  if (!old) {
    emitter.backlog = {}
  }

  return emitter

  function context (contextOrStore) {
    if (contextOrStore && contextOrStore instanceof EventContext) {
      return contextOrStore
    } else if (contextOrStore) {
      return (0,_util_get_or_set__WEBPACK_IMPORTED_MODULE_1__/* .getOrSet */ .X)(contextOrStore, ctxId, getNewContext)
    } else {
      return getNewContext()
    }
  }

  function emit (type, args, contextOrStore, force, bubble) {
    console.log("emit...", type, args, contextOrStore, force, bubble)
    if (bubble !== false) bubble = true
    if (baseEE.aborted && !force) { return }
    if (old && bubble) old.emit(type, args, contextOrStore)
    // console.log("continue...")

    var ctx = context(contextOrStore)
    var handlersArray = listeners(type)
    var len = handlersArray.length

    // Extremely verbose debug logging
    // if ([/^xhr/].map(function (match) {return type.match(match)}).filter(Boolean).length) {
    //  console.log(type + ' args:')
    //  console.log(args)
    //  console.log(type + ' handlers array:')
    //  console.log(handlersArray)
    //  console.log(type + ' context:')
    //  console.log(ctx)
    //  console.log(type + ' ctxStore:')
    //  console.log(ctxStore)
    // }

    // Apply each handler function in the order they were added
    // to the context with the arguments

    console.log("handlersArray...", handlersArray)
    for (var i = 0; i < len; i++) handlersArray[i].apply(ctx, args)

    // console.log(bufferGroupMap[type])
    // Buffer after emitting for consistent ordering
    var bufferGroup = getBuffer()[bufferGroupMap[type]]
    if (bufferGroup) {
      bufferGroup.push([emitter, type, args, ctx])
    }

    // console.log(bufferGroup)

    // Return the context so that the module that emitted can see what was done.
    return ctx
  }

  function addEventListener (type, fn) {
    // Retrieve type from handlers, if it doesn't exist assign the default and retrieve it.
    handlers[type] = listeners(type).concat(fn)
  }

  function removeEventListener (type, fn) {
    var listeners = handlers[type]
    if (!listeners) return
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i] === fn) {
        listeners.splice(i, 1)
      }
    }
  }

  function listeners (type) {
    return handlers[type] || []
  }

  function getOrCreate (name) {
    console.log("get or create emitter - ", name)
    return (emitters[name] = emitters[name] || ee(emitter, name))
  }

  function bufferEventsByGroup (types, group) {
    var eventBuffer = getBuffer()

    // do not buffer events if agent has been aborted
    if (emitter.aborted) return
    ;(0,_util_map_own__WEBPACK_IMPORTED_MODULE_2__/* .mapOwn */ .D)(types, function (i, type) {
      group = group || 'feature'
      bufferGroupMap[type] = group
      if (!(group in eventBuffer)) {
        eventBuffer[group] = []
      }
    })
  }

  function isBuffering(type) {
    var bufferGroup = getBuffer()[bufferGroupMap[type]]
    return !!bufferGroup
  }

  // buffer is associated with a base emitter, since there are two
  // (global and scoped to the current bundle), it is now part of the emitter
  function getBuffer() {
    if (old) {
      return old.backlog
    }
    return emitter.backlog
  }
}

// get context object from store object, or create if does not exist
function getOrSetContext(obj) {
  return (0,_util_get_or_set__WEBPACK_IMPORTED_MODULE_1__/* .getOrSet */ .X)(obj, ctxId, getNewContext)
}

function getNewContext () {
  return new EventContext()
}

// abort should be called 30 seconds after the page has started running
// We should drop our data and stop collecting if we still have a backlog, which
// signifies the rest of the agent wasn't loaded
function abortIfNotLoaded () {
  console.log('aborted!')
  if (baseEE.backlog.api || baseEE.backlog.feature) {
    baseEE.aborted = true
    baseEE.backlog = {}
  }
}


/***/ }),

/***/ 108:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CO": () => (/* binding */ globalHandle),
/* harmony export */   "EM": () => (/* binding */ handleEE),
/* harmony export */   "l_": () => (/* binding */ globalEE),
/* harmony export */   "pr": () => (/* binding */ handle)
/* harmony export */ });
/* harmony import */ var _contextual_ee__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(75);
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


var handleEE = _contextual_ee__WEBPACK_IMPORTED_MODULE_0__.ee.get('handle')
var globalEE = _contextual_ee__WEBPACK_IMPORTED_MODULE_0__/* .global.get */ .C.get('handle')

// Exported for register-handler to attach to.
// export default handle


function handle (type, args, ctx, group) {
  console.log("handle", type, args, ctx, group)
  handleEE.buffer([type], group)
  handleEE.emit(type, args, ctx)
}

function globalHandle(type, args, ctx, group) {
  globalEE.buffer([type], group)
  globalEE.emit(type, args, ctx)
}


/***/ }),

/***/ 326:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "m": () => (/* binding */ eventListenerOpts)
/* harmony export */ });
var supportsPassive = false
try {
  var opts = Object.defineProperty({}, 'passive', {
    get: function() {
      supportsPassive = true
    }
  })
  window.addEventListener('testPassive', null, opts)
  window.removeEventListener('testPassive', null, opts)
} catch (e) {}

function eventListenerOpts(useCapture) {
  return supportsPassive ? {passive: true, capture: !!useCapture} : !!useCapture
}

// export default eventListenerOpts


/***/ }),

/***/ 858:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "zO": () => (/* binding */ now)
});

// UNUSED EXPORTS: getLastTimestamp, getOffset, setOffset

;// CONCATENATED MODULE: ../../modules/common/timing/performance-check.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
const exists = typeof (window.performance) !== 'undefined' && window.performance.timing && typeof (window.performance.timing.navigationStart) !== 'undefined'
// export default {
//   exists
// }

;// CONCATENATED MODULE: ../../modules/common/timing/now.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */



var lastTimestamp = new Date().getTime()
var offset = lastTimestamp

// export default now

function now () {
  if (exists && performance.now) {
    return Math.round(performance.now())
  }
  // ensure a new timestamp is never smaller than a previous timestamp
  return (lastTimestamp = Math.max(new Date().getTime(), lastTimestamp)) - offset
}

function getLastTimestamp() {
  return lastTimestamp
}

function setOffset (val){
  offset = val
}

function getOffset (){
  return offset
}


/***/ }),

/***/ 995:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "X": () => (/* binding */ getOrSet)
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var has = Object.prototype.hasOwnProperty

// export default getOrSet

// Always returns the current value of obj[prop], even if it has to set it first
function getOrSet (obj, prop, getVal) {
  // If the value exists return it.
  if (has.call(obj, prop)) return obj[prop]

  var val = getVal()

  // Attempt to set the property so it's not enumerable
  if (Object.defineProperty && Object.keys) {
    try {
      Object.defineProperty(obj, prop, {
        value: val, // old IE inherits non-write-ability
        writable: true,
        enumerable: false
      })

      return val
    } catch (e) {
      // Can't report internal errors,
      // because GOS is a dependency of the reporting mechanisms
    }
  }

  // fall back to setting normally
  obj[prop] = val
  return val
}


/***/ }),

/***/ 343:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "D": () => (/* binding */ mapOwn)
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var has = Object.prototype.hasOwnProperty

// export default mapOwn

function mapOwn (obj, fn) {
  var results = []
  var key = ''
  var i = 0

  for (key in obj) {
    if (has.call(obj, key)) {
      results[i] = fn(key, obj[key])
      i += 1
    }
  }

  return results
}


/***/ }),

/***/ 453:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ce": () => (/* binding */ defaults),
/* harmony export */   "fP": () => (/* binding */ gosNREUM),
/* harmony export */   "mF": () => (/* binding */ gosNREUMOriginals)
/* harmony export */ });
/* unused harmony exports gosNREUMInfo, gosNREUMLoaderConfig, gosNREUMInit, addFnToNREUM, gosCDN */
/* harmony import */ var _constants_environment_variables__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(960);



const defaults = {
  agent:  `js-agent.newrelic.com/${_constants_environment_variables__WEBPACK_IMPORTED_MODULE_0__/* .PATH */ .m}nr${_constants_environment_variables__WEBPACK_IMPORTED_MODULE_0__/* .VERSION */ .q}.min.js`,
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net',
  version: _constants_environment_variables__WEBPACK_IMPORTED_MODULE_0__/* .VERSION */ .q
}

function gosNREUM(){
  if (!window.NREUM) {
    window.NREUM = {}
  }
  if (typeof (window.newrelic) === 'undefined') window.newrelic = window.NREUM
  return window.NREUM
}

function gosNREUMInfo(){
  let nr = gosNREUM()
  const externallySupplied = nr.info || {}
  
  nr.info = {
    beacon: defaults.beacon,
    errorBeacon: defaults.errorBeacon,
    agent:  defaults.agent,
    ...externallySupplied
  }
  
  return nr
}

function gosNREUMLoaderConfig(){
  let nr = gosNREUM()
  const externallySupplied = nr.loader_config || {}
  
  nr.loader_config = {
    ...externallySupplied
  }
  
  return nr
}

function gosNREUMInit(){
  let nr = gosNREUM()
  const externallySupplied = nr.init || {}
  
  nr.init = {
    ...externallySupplied
  }
  
  return nr
}


function gosNREUMOriginals() {
  let nr = gosNREUM()
  if (!nr.o) {
    var win = window
    // var doc = win.document
    var XHR = win.XMLHttpRequest

    nr.o = {
      ST: setTimeout,
      SI: win.setImmediate,
      CT: clearTimeout,
      XHR: XHR,
      REQ: win.Request,
      EV: win.Event,
      PR: win.Promise,
      MO: win.MutationObserver,
      FETCH: win.fetch
    }
  }
  return nr
}

function addFnToNREUM(fnName, fn){
  let nr = gosNREUM()
  nr[fnName] = fn
}

function gosCDN() {
  console.log("set up NREUM for the CDN!")
  gosNREUMInfo()
  gosNREUMInit()
  gosNREUMOriginals()
  gosNREUMLoaderConfig()
  return gosNREUM()
}


/***/ }),

/***/ 623:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "initialize": () => (/* binding */ initialize),
  "storeError": () => (/* binding */ storeError)
});

;// CONCATENATED MODULE: ../../modules/features/js-errors/aggregate/canonical-function-name.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var canonicalFunctionNameRe = /([a-z0-9]+)$/i
function canonicalFunctionName (orig) {
  if (!orig) return

  var match = orig.match(canonicalFunctionNameRe)
  if (match) return match[1]

  return
}

// export default canonicalFunctionName
// module.exports = canonicalFunctionName

;// CONCATENATED MODULE: ../../modules/common/util/reduce.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

function reduce_reduce (arr, fn, next) {
  var i = 0
  if (typeof next === 'undefined') {
    next = arr[0]
    i = 1
  }

  for (i; i < arr.length; i++) {
    next = fn(next, arr[i])
  }

  return next
}

;// CONCATENATED MODULE: ../../modules/features/js-errors/aggregate/format-stack-trace.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var stripNewlinesRegex = /^\n+|\n+$/g
var MAX_STACK_TRACE_LENGTH = 65530

function formatStackTrace(stackLines) {
  return truncateStackLines(stackLines).replace(stripNewlinesRegex, '')
}

// module.exports.truncateSize = truncateSize

// takes array of stack lines and returns string with top 50 and buttom 50 lines
function truncateStackLines(stackLines) {
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
function truncateSize(stackString) {
  return (stackString.length > MAX_STACK_TRACE_LENGTH) ? stackString.substr(0, MAX_STACK_TRACE_LENGTH) : stackString
}

;// CONCATENATED MODULE: ../../modules/features/js-errors/aggregate/compute-stack-trace.js
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



var debug = false

var classNameRegex = /function (.+?)\s*\(/
var chrome = /^\s*at (?:((?:\[object object\])?(?:[^(]*\([^)]*\))*[^()]*(?: \[as \S+\])?) )?\(?((?:file|http|https|chrome-extension):.*?)?:(\d+)(?::(\d+))?\)?\s*$/i
var gecko = /^\s*(?:(\S*|global code)(?:\(.*?\))?@)?((?:file|http|https|chrome|safari-extension).*?):(\d+)(?::(\d+))?\s*$/i
var chrome_eval = /^\s*at .+ \(eval at \S+ \((?:(?:file|http|https):[^)]+)?\)(?:, [^:]*:\d+:\d+)?\)$/i
var ie_eval = /^\s*at Function code \(Function code:\d+:\d+\)\s*/i

// export default computeStackTrace
// module.exports = computeStackTrace

function computeStackTrace (ex) {
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

  var errorInfo = reduce_reduce(
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

;// CONCATENATED MODULE: ../../modules/features/js-errors/aggregate/string-hash-code.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

function stringHashCode (string) {
  var hash = 0
  var charVal

  if (!string || !string.length) return hash
  for (var i = 0; i < string.length; i++) {
    charVal = string.charCodeAt(i)
    hash = ((hash << 5) - hash) + charVal
    hash = hash | 0 // Convert to 32bit integer
  }
  return hash
}

// export default stringHashCode
// module.exports = stringHashCode

// EXTERNAL MODULE: ../../modules/common/util/map-own.js
var map_own = __webpack_require__(343);
;// CONCATENATED MODULE: ../../modules/common/aggregate/aggregator.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */



var aggregatedData = {}

// export default {
//   store: storeEventMetrics,
//   storeMetric: storeMetric,
//   take: take,
//   get: get,
//   merge: mergeMetrics
// }




// Items with the same type and name get aggregated together
// params are example data from the aggregated items
// metrics are the numeric values to be aggregated

// store a single metric not tied to an event, metric values are stored in a single `stats` object property
function storeMetric (type, name, params, value) {
  console.log("store metric not tied to an event", type, name)
  var bucket = getBucket(type, name, params)
  bucket.stats = updateMetric(value, bucket.stats)
  return bucket
}

// store multiple metrics tied to an event, metrics are stored in a `metrics` property (map of name-stats metrics)
function storeEventMetrics (type, name, params, newMetrics, customParams) {
  console.log("storeEventMetrics", type, name)
  var bucket = getBucket(type, name, params, customParams)
  bucket.metrics = aggregateMetrics(newMetrics, bucket.metrics)
  return bucket
}

function aggregateMetrics (newMetrics, oldMetrics) {
  if (!oldMetrics) oldMetrics = {count: 0}
  oldMetrics.count += 1
  ;(0,map_own/* mapOwn */.D)(newMetrics, function (key, value) {
    oldMetrics[key] = updateMetric(value, oldMetrics[key])
  })
  return oldMetrics
}

function updateMetric (value, metric) {
  // when there is no value, then send only count
  if (value == null) {
    return updateCounterMetric(metric)
  }

  // When there is only one data point, the c (count), min, max, and sos (sum of squares) params are superfluous.
  if (!metric) return {t: value}

  // but on the second data point, we need to calculate the other values before aggregating in new values
  if (!metric.c) {
    metric = createMetricObject(metric.t)
  }

  // at this point, metric is always uncondensed
  metric.c += 1
  metric.t += value
  metric.sos += value * value
  if (value > metric.max) metric.max = value
  if (value < metric.min) metric.min = value

  return metric
}

function updateCounterMetric(metric) {
  if (!metric) {
    metric = {c: 1}
  } else {
    metric.c++
  }
  return metric
}

/**
 * Merge metrics object into existing metrics.
 *
 * @param {string} type
 * @param {string} name
 * @param {object} metrics - Metrics to merge.
 */
function mergeMetrics (type, name, metrics, params, customParams) {
  var bucket = getBucket(type, name, params, customParams)

  if (!bucket.metrics) {
    bucket.metrics = metrics
    return
  }

  var oldMetrics = bucket.metrics
  oldMetrics.count += metrics.count

  // iterate through each new metric and merge
  ;(0,map_own/* mapOwn */.D)(metrics, function (key, value) {
    // count is a special case handled above
    if (key === 'count') return

    var oldMetric = oldMetrics[key]
    var newMetric = metrics[key]

    // handling the case where newMetric is a single-value first
    if (newMetric && !newMetric.c) {
      oldMetrics[key] = updateMetric(newMetric.t, oldMetric)
    } else { // newMetric is a metric object
      oldMetrics[key] = mergeMetric(newMetric, oldMetrics[key])
    }
  })
}

function mergeMetric(newMetric, oldMetric) {
  if (!oldMetric) return newMetric

  if (!oldMetric.c) {
    // oldMetric is a single-value
    oldMetric = createMetricObject(oldMetric.t)
  }

  oldMetric.min = Math.min(newMetric.min, oldMetric.min)
  oldMetric.max = Math.max(newMetric.max, oldMetric.max)
  oldMetric.t += newMetric.t
  oldMetric.sos += newMetric.sos
  oldMetric.c += newMetric.c

  return oldMetric
}

// take a value and create a metric object
function createMetricObject (value) {
  return {
    t: value,
    min: value,
    max: value,
    sos: value * value,
    c: 1
  }
}

function getBucket (type, name, params, customParams) {
  if (!aggregatedData[type]) aggregatedData[type] = {}
  var bucket = aggregatedData[type][name]
  if (!bucket) {
    bucket = aggregatedData[type][name] = { params: params || {} }
    if (customParams) {
      bucket.custom = customParams
    }
  }
  return bucket
}

function get (type, name) {
  // if name is passed, get a single bucket
  if (name) return aggregatedData[type] && aggregatedData[type][name]
  // else, get all buckets of that type
  return aggregatedData[type]
}

// Like get, but for many types and it deletes the retrieved content from the aggregatedData
function take (types) {
  var results = {}
  var type = ''
  var hasData = false
  for (var i = 0; i < types.length; i++) {
    type = types[i]
    results[type] = toArray(aggregatedData[type])
    if (results[type].length) hasData = true
    delete aggregatedData[type]
  }
  return hasData ? results : null
}

function toArray (obj) {
  if (typeof obj !== 'object') return []

  return (0,map_own/* mapOwn */.D)(obj, getValue)
}

function getValue (key, value) {
  return value
}

// EXTERNAL MODULE: ../../modules/common/event-emitter/handle.js
var handle = __webpack_require__(108);
;// CONCATENATED MODULE: ../../modules/common/event-emitter/register-handler.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */



// export default defaultRegister



defaultRegister.on = registerWithSpecificEmitter

var handlers = defaultRegister.handlers = {}
var globalHandlers = globalRegister.handlers = {}

function defaultRegister (type, handler, group, ee) {
  console.log("register...", type)
  registerWithSpecificEmitter(ee || handle/* handleEE */.EM, handlers, type, handler, group)
}

function globalRegister (type, handler, group) {
  registerWithSpecificEmitter(handle/* globalEE */.l_, globalHandlers, type, handler, group)
}

function registerWithSpecificEmitter (ee, handlers, type, handler, group) {
  if (!group) group = 'feature'
  if (!ee) ee = handle/* handleEE */.EM

  console.log('type', type, 'should sub to ee', ee.debugId)

  if (ee.isBuffering(type)) {
    var groupHandlers = handlers[group] = handlers[group] || {}
    var list = groupHandlers[type] = groupHandlers[type] || []
    list.push([ee, handler])
  } else {
    ee.on(type, handler)
  }
}

// EXTERNAL MODULE: ../../modules/common/event-emitter/contextual-ee.js
var contextual_ee = __webpack_require__(75);
;// CONCATENATED MODULE: ../../modules/common/util/stringify.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */




var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g // eslint-disable-line
var meta = {
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  '"': '\\"',
  '\\': '\\\\'
}

// export default stringify

function stringify (val) {
  try {
    return str('', {'': val})
  } catch (e) {
    try {
      contextual_ee.ee.emit('internal-error', [e])
    } catch (err) {
    }
  }
}

function quote (string) {
  escapable.lastIndex = 0
  return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
    var c = meta[a]
    return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4)
  }) + '"' : '"' + string + '"'
}

function str (key, holder) {
  var value = holder[key]

  switch (typeof value) {
    case 'string':
      return quote(value)
    case 'number':
      return isFinite(value) ? String(value) : 'null'
    case 'boolean':
      return String(value)
    case 'object':
      if (!value) { return 'null' }
      var partial = []

      // The value is an array. Stringify every element. Use null as a placeholder
      // for non-JSON values.
      if (value instanceof window.Array || Object.prototype.toString.apply(value) === '[object Array]') {
        var length = value.length
        for (var i = 0; i < length; i += 1) {
          partial[i] = str(i, value) || 'null'
        }

        return partial.length === 0 ? '[]' : '[' + partial.join(',') + ']'
      }

      (0,map_own/* mapOwn */.D)(value, function (k) {
        var v = str(k, value)
        if (v) partial.push(quote(k) + ':' + v)
      })

      return partial.length === 0 ? '{}' : '{' + partial.join(',') + '}'
  }
}

;// CONCATENATED MODULE: ../../modules/common/url/encode.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */




// Characters that are safe in a qs, but get encoded.
var charMap = {
  '%2C': ',',
  '%3A': ':',
  '%2F': '/',
  '%40': '@',
  '%24': '$',
  '%3B': ';'
}

var charList = (0,map_own/* mapOwn */.D)(charMap, function (k) { return k })
var safeEncoded = new RegExp(charList.join('|'), 'g')

function real (c) {
  return charMap[c]
}

// Encode as URI Component, then unescape anything that is ok in the
// query string position.
function qs (value) {
  if (value === null || value === undefined) return 'null'
  return encodeURIComponent(value).replace(safeEncoded, real)
}

// export default {obj: obj, fromArray: fromArray, qs: qs, param: param}

function fromArray (qs, maxBytes) {
  var bytes = 0
  for (var i = 0; i < qs.length; i++) {
    bytes += qs[i].length
    if (bytes > maxBytes) return qs.slice(0, i).join('')
  }
  return qs.join('')
}

function obj (payload, maxBytes) {
  var total = 0
  var result = ''

  ;(0,map_own/* mapOwn */.D)(payload, function (feature, dataArray) {
    var intermediate = []
    var next
    var i

    if (typeof dataArray === 'string') {
      next = '&' + feature + '=' + qs(dataArray)
      total += next.length
      result += next
    } else if (dataArray.length) {
      total += 9
      for (i = 0; i < dataArray.length; i++) {
        next = qs(stringify(dataArray[i]))
        total += next.length
        if (typeof maxBytes !== 'undefined' && total >= maxBytes) break
        intermediate.push(next)
      }
      result += '&' + feature + '=%5B' + intermediate.join(',') + '%5D'
    }
  })
  return result
}

// Constructs an HTTP parameter to add to the BAM router URL
function param (name, value) {
  if (value && typeof (value) === 'string') {
    return '&' + name + '=' + qs(value)
  }
  return ''
}

;// CONCATENATED MODULE: ../../modules/common/util/submit-data.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const submitData = {}
// export default submitData

submitData.jsonp = function jsonp (url, jsonp) {
  var element = document.createElement('script')
  element.type = 'text/javascript'
  element.src = url + '&jsonp=' + jsonp
  var firstScript = document.getElementsByTagName('script')[0]
  firstScript.parentNode.insertBefore(element, firstScript)
  return element
}

submitData.xhr = function xhr (url, body, sync) {
  var request = new XMLHttpRequest()

  request.open('POST', url, !sync)
  try {
    // Set cookie
    if ('withCredentials' in request) request.withCredentials = true
  } catch (e) {}

  request.setRequestHeader('content-type', 'text/plain')
  request.send(body)
  return request
}

submitData.xhrSync = function xhrSync (url, body) {
  return submitData.xhr(url, body, true)
}

submitData.img = function img (url) {
  var element = new Image()
  element.src = url
  return element
}

submitData.beacon = function (url, body) {
  return navigator.sendBeacon(url, body)
}

;// CONCATENATED MODULE: ../../modules/common/url/location.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// export default {
//   getLocation: getLocation
// }

function getLocation() {
  return '' + location
}

// EXTERNAL MODULE: ../../modules/common/config/config.js
var config = __webpack_require__(756);
;// CONCATENATED MODULE: ../../modules/common/url/clean-url.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var withHash = /([^?#]*)[^#]*(#[^?]*|$).*/
var withoutHash = /([^?#]*)().*/
function cleanURL (url, keepHash) {
  return url.replace(keepHash ? withHash : withoutHash, '$1$2')
}

// export default cleanURL

// EXTERNAL MODULE: ../../modules/common/timing/now.js + 1 modules
var now = __webpack_require__(858);
// EXTERNAL MODULE: ../../modules/common/event-listener/event-listener-opts.js
var event_listener_opts = __webpack_require__(326);
// EXTERNAL MODULE: ../../modules/common/browser-version/ie-version.js
var ie_version = __webpack_require__(283);
// EXTERNAL MODULE: ../../modules/common/constants/environment-variables.js
var environment_variables = __webpack_require__(960);
;// CONCATENATED MODULE: ../../modules/common/harvest/harvest.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */














const version = environment_variables/* VERSION */.q
// var version = '<VERSION>'
// var jsonp = 'NREUM.setToken'
var _events = {}
var haveSendBeacon = !!navigator.sendBeacon
var tooManyRequestsDelay = config.getConfigurationValue('harvest.tooManyRequestsDelay') || 60
var getScheme = () => (config.getConfigurationValue('ssl') === false) ? 'http' : 'https'

// requiring ie version updates the IE version on the loader object
// var ieVersion = require('./ie-version')
var xhrUsable = ie_version.ieVersion > 9 || ie_version.ieVersion === 0

// export default {
//   sendFinal: sendAllFromUnload,
//   sendX: sendX,
//   send: send,
//   on: on,
//   xhrUsable: xhrUsable,
//   resetListeners: resetListeners,
//   getSubmitMethod: getSubmitMethod
// }



function sendAllFromUnload () {
  var sents = mapOwn(_events, function (endpoint) {
    return sendX(endpoint, { unload: true })
  })
  return reduce(sents, or)
}

function or (a, b) { return a || b }

function createPayload (type, options) {
  var makeBody = createAccumulator()
  var makeQueryString = createAccumulator()
  var listeners = (_events[type] && _events[type] || [])

  for (var i = 0; i < listeners.length; i++) {
    var singlePayload = listeners[i](options)
    if (!singlePayload) continue
    if (singlePayload.body) (0,map_own/* mapOwn */.D)(singlePayload.body, makeBody)
    if (singlePayload.qs) (0,map_own/* mapOwn */.D)(singlePayload.qs, makeQueryString)
  }
  return { body: makeBody(), qs: makeQueryString() }
}

/**
 * Initiate a harvest from multiple sources. An event that corresponds to the endpoint
 * name is emitted, which gives any listeners the opportunity to provide payload data.
 *
 * @param {string} endpoint - The endpoint of the harvest (jserrors, events, resources etc.)
 * @param {object} nr - The loader singleton.
 *
 * @param {object} opts
 * @param {bool} opts.needResponse - Specify whether the caller expects a response data.
 * @param {bool} opts.unload - Specify whether the call is a final harvest during page unload.
 */
function sendX (endpoint, opts, cbFinished) {
  var submitMethod = getSubmitMethod(endpoint, opts)
  // console.log('submit method', submitMethod)
  if (!submitMethod) return false
  var options = {
    retry: submitMethod.method === submitData.xhr
  }
  // console.log('_send!', endpoint, opts, options)
  return _send(endpoint, createPayload(endpoint, options), opts, submitMethod, cbFinished)
}

/**
 * Initiate a harvest call.
 *
 * @param {string} endpoint - The endpoint of the harvest (jserrors, events, resources etc.)
 * @param {object} nr - The loader singleton.
 *
 * @param {object} singlePayload - Object representing payload.
 * @param {object} singlePayload.qs - Map of values that should be sent as part of the request query string.
 * @param {string} singlePayload.body - String that should be sent as the body of the request.
 * @param {string} singlePayload.body.e - Special case of body used for browser interactions.
 *
 * @param {object} opts
 * @param {bool} opts.needResponse - Specify whether the caller expects a response data.
 * @param {bool} opts.unload - Specify whether the call is a final harvest during page unload.
 */
function send (endpoint, singlePayload, opts, submitMethod, cbFinished) {
  var makeBody = createAccumulator()
  var makeQueryString = createAccumulator()
  if (singlePayload.body) (0,map_own/* mapOwn */.D)(singlePayload.body, makeBody)
  if (singlePayload.qs) (0,map_own/* mapOwn */.D)(singlePayload.qs, makeQueryString)

  var payload = { body: makeBody(), qs: makeQueryString() }
  return _send(endpoint, payload, opts, submitMethod, cbFinished)
}

function _send (endpoint, payload, opts, submitMethod, cbFinished) {
  var info = config.getInfo()
  // console.log('info in send!', info)
  if (!info.errorBeacon) return false

  if (!payload.body) {
    // console.log('no payload body')
    if (cbFinished) {
      cbFinished({ sent: false })
    }
    return false
  }

  if (!opts) opts = {}

  // console.log("_send... getScheme!", getScheme())
  var url = getScheme() + '://' + info.errorBeacon + '/' + endpoint + '/1/' + info.licenseKey + baseQueryString()
  if (payload.qs) url += obj(payload.qs, config.runtime.maxBytes)

  if (!submitMethod) {
    submitMethod = getSubmitMethod(endpoint, opts)
  }
  var method = submitMethod.method
  var useBody = submitMethod.useBody

  var body
  var fullUrl = url
  if (useBody && endpoint === 'events') {
    body = payload.body.e
  } else if (useBody) {
    body = stringify(payload.body)
  } else {
    fullUrl = url + obj(payload.body, config.runtime.maxBytes)
  }

  var result = method(fullUrl, body)

  // console.log('result...', result)
  if (cbFinished && method === submitData.xhr) {
    // console.log('in cbFinished')
    var xhr = result
    xhr.addEventListener('load', function () {
      var result = { sent: true }
      if (this.status === 429) {
        result.retry = true
        result.delay = tooManyRequestsDelay
      } else if (this.status === 408 || this.status === 500 || this.status === 503) {
        result.retry = true
      }

      if (opts.needResponse) {
        result.responseText = this.responseText
      }
      cbFinished(result)
    }, (0,event_listener_opts/* eventListenerOpts */.m)(false))
  }

  // if beacon request failed, retry with an alternative method
  if (!result && method === submitData.beacon) {
    method = submitData.img
    result = method(url + obj(payload.body, config.runtime.maxBytes))
  }

  return result
}

function getSubmitMethod(endpoint, opts) {
  opts = opts || {}
  var method
  var useBody

  if (opts.needResponse) {
    if (xhrUsable) {
      useBody = true
      method = submitData.xhr
    } else {
      return false
    }
  } else if (opts.unload) {
    useBody = haveSendBeacon
    method = haveSendBeacon ? submitData.beacon : submitData.img
  } else {
    // `submitData.beacon` was removed, there is an upper limit to the
    // number of data allowed before it starts failing, so we save it for
    // unload data
    if (xhrUsable) {
      useBody = true
      method = submitData.xhr
    } else if (endpoint === 'events' || endpoint === 'jserrors') {
      method = submitData.img
    } else {
      return false
    }
  }

  return {
    method: method,
    useBody: useBody
  }
}

// Constructs the transaction name param for the beacon URL.
// Prefers the obfuscated transaction name over the plain text.
// Falls back to making up a name.
function transactionNameParam (info) {
  if (info.transactionName) return param('to', info.transactionName)
  return param('t', info.tNamePlain || 'Unnamed Transaction')
}

function on (type, listener) {
  var listeners = (_events[type] || (_events[type] = []))
  listeners.push(listener)
}

function resetListeners() {
  mapOwn(_events, function(key) {
    _events[key] = []
  })
}

// The stuff that gets sent every time.
function baseQueryString () {
  var areCookiesEnabled = true
  const init = config.getConfiguration()
  if ('privacy' in init) {
    areCookiesEnabled = init.privacy.cookies_enabled
  }

  var info = config.getInfo()

  return ([
    '?a=' + info.applicationID,
    param('sa', (info.sa ? '' + info.sa : '')),
    param('v', version),
    transactionNameParam(info),
    param('ct', config.runtime.customTransaction),
    '&rst=' + (0,now/* now */.zO)(),
    '&ck=' + (areCookiesEnabled ? '1' : '0'),
    param('ref', cleanURL(getLocation())),
    param('ptid', (config.runtime.ptid ? '' + config.runtime.ptid : ''))
  ].join(''))
}

// returns a function that can be called to accumulate values to a single object
// when the function is called without parameters, then the accumulator is returned
function createAccumulator () {
  var accumulator = {}
  var hasData = false
  return function (key, val) {
    if (val && val.length) {
      accumulator[key] = val
      hasData = true
    }
    if (hasData) return accumulator
  }
}

;// CONCATENATED MODULE: ../../modules/common/harvest/harvest-scheduler.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */




/**
 * Periodically invokes harvest calls and handles retries
 */
function HarvestScheduler(endpoint, opts) {
  console.log('harvest scheduler!')
  this.endpoint = endpoint
  this.opts = opts || {}
  this.started = false
  this.timeoutHandle = null
}

HarvestScheduler.prototype.startTimer = function startTimer(interval, initialDelay) {
  this.interval = interval
  this.started = true
  this.scheduleHarvest(initialDelay != null ? initialDelay : this.interval)
}

HarvestScheduler.prototype.stopTimer = function stopTimer() {
  this.started = false
  if (this.timeoutHandle) {
    clearTimeout(this.timeoutHandle)
  }
}

HarvestScheduler.prototype.scheduleHarvest = function scheduleHarvest(delay, opts) {
  // console.log('schedule harvest!', delay, opts)
  if (this.timeoutHandle) return
  var timer = this

  if (delay == null) {
    delay = this.interval
  }
  this.timeoutHandle = setTimeout(function() {
    timer.timeoutHandle = null
    timer.runHarvest(opts)
  }, delay * 1000)
}

HarvestScheduler.prototype.runHarvest = function runHarvest(opts) {
  // console.log('run harvest!')
  var scheduler = this

  if (this.opts.getPayload) {
    // console.log('getPayload')
    var submitMethod = getSubmitMethod(this.endpoint, opts)
    // console.log('submitMethod', submitMethod)
    if (!submitMethod) return false

    var retry = submitMethod.method === submitData.xhr
    var payload = this.opts.getPayload({ retry: retry })
    if (payload) {
      payload = Object.prototype.toString.call(payload) === '[object Array]' ? payload : [payload]
      for (var i = 0; i < payload.length; i++) {
        // console.log('send')
        send(this.endpoint, payload[i], opts, submitMethod, onHarvestFinished)
      }
    }
  } else {
    // console.log('sendX')
    sendX(this.endpoint, opts, onHarvestFinished)
  }

  if (this.started) {
    // console.log('started... schedule harvest')
    this.scheduleHarvest()
  }

  function onHarvestFinished(result) {
    scheduler.onHarvestFinished(opts, result)
  }
}

HarvestScheduler.prototype.onHarvestFinished = function onHarvestFinished(opts, result) {
  // console.log('harvest finished!')
  if (this.opts.onFinished) {
    this.opts.onFinished(result)
  }

  if (result.sent && result.retry) {
    var delay = result.delay || this.opts.retryDelay
    // reschedule next harvest if should be delayed longer
    if (this.started && delay) {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = null
      this.scheduleHarvest(delay, opts)
    } else if (!this.started && delay) {
      // if not running on a timer, schedule a single retry
      this.scheduleHarvest(delay, opts)
    }
  }
}

;// CONCATENATED MODULE: ../../modules/features/js-errors/aggregate/index.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


















console.log('err-aggregate module has been imported!')
var stackReported = {}
var pageviewReported = {}
var errorCache = {}
var currentBody

// Make sure loader.offset is as accurate as possible
// require('../../../agent/start-time')

var errorOnPage = false

// ee.on('feat-err', initialize)

// export default {
//   initialize: initialize,
//   storeError: storeError
// }

function initialize(captureGlobal) {
  console.log('errors has been initialized!')
  defaultRegister('err', storeError)
  defaultRegister('ierr', storeError)

  if (captureGlobal) {
    globalRegister('err', storeError)
    globalRegister('ierr', storeError)
  }

  var harvestTimeSeconds = (0,config.getConfigurationValue)('jserrors.harvestTimeSeconds') || 10

  on('jserrors', onHarvestStarted)
  var scheduler = new HarvestScheduler('jserrors', { onFinished: onHarvestFinished })
  scheduler.startTimer(harvestTimeSeconds)
}

function onHarvestStarted(options) {
  console.log('onHarvestStarted!')
  var body = take([ 'err', 'ierr' ])

  if (options.retry) {
    currentBody = body
  }

  var payload = { body: body, qs: {} }
  var releaseIds = stringify(config.runtime.releaseIds)

  if (releaseIds !== '{}') {
    payload.qs.ri = releaseIds
  }

  if (body && body.err && body.err.length && !errorOnPage) {
    payload.qs.pve = '1'
    errorOnPage = true
  }
  return payload
}

function onHarvestFinished(result) {
  if (result.retry && currentBody) {
    (0,map_own/* mapOwn */.D)(currentBody, function(key, value) {
      for (var i = 0; i < value.length; i++) {
        var bucket = value[i]
        var name = getBucketName(bucket.params, bucket.custom)
        mergeMetrics(key, name, bucket.metrics, bucket.params, bucket.custom)
      }
    })
    currentBody = null
  }
}

function nameHash (params) {
  return stringHashCode(params.exceptionClass) ^ params.stackHash
}

function getBucketName(params, customParams) {
  return nameHash(params) + ':' + stringHashCode(stringify(customParams))
}

function canonicalizeURL (url, cleanedOrigin) {
  if (typeof url !== 'string') return ''

  var cleanedURL = cleanURL(url)
  if (cleanedURL === cleanedOrigin) {
    return '<inline>'
  } else {
    return cleanedURL
  }
}

function buildCanonicalStackString (stackInfo, cleanedOrigin) {
  var canonicalStack = ''

  for (var i = 0; i < stackInfo.frames.length; i++) {
    var frame = stackInfo.frames[i]
    var func = canonicalFunctionName(frame.func)

    if (canonicalStack) canonicalStack += '\n'
    if (func) canonicalStack += func + '@'
    if (typeof frame.url === 'string') canonicalStack += frame.url
    if (frame.line) canonicalStack += ':' + frame.line
  }

  return canonicalStack
}

// Strip query parameters and fragments from the stackString property of the
// given stackInfo, along with the 'url' properties of each frame in
// stackInfo.frames.
//
// Any URLs that are equivalent to the cleaned version of the origin will also
// be replaced with the string '<inline>'.
//
function canonicalizeStackURLs (stackInfo) {
  // Currently, loader.origin might contain a fragment, but we don't want to use it
  // for comparing with frame URLs.
  var cleanedOrigin = cleanURL(config.runtime.origin)

  for (var i = 0; i < stackInfo.frames.length; i++) {
    var frame = stackInfo.frames[i]
    var originalURL = frame.url
    var cleanedURL = canonicalizeURL(originalURL, cleanedOrigin)
    if (cleanedURL && cleanedURL !== frame.url) {
      frame.url = cleanedURL
      stackInfo.stackString = stackInfo.stackString.split(originalURL).join(cleanedURL)
    }
  }

  return stackInfo
}

function storeError (err, time, internal, customAttributes) {
  // are we in an interaction
  time = time || (0,now/* now */.zO)()
  if (!internal && config.runtime.onerror && config.runtime.onerror(err)) return

  var stackInfo = canonicalizeStackURLs(computeStackTrace(err))
  var canonicalStack = buildCanonicalStackString(stackInfo)

  var params = {
    stackHash: stringHashCode(canonicalStack),
    exceptionClass: stackInfo.name,
    request_uri: window.location.pathname
  }
  if (stackInfo.message) {
    params.message = '' + stackInfo.message
  }

  if (!stackReported[params.stackHash]) {
    stackReported[params.stackHash] = true
    params.stack_trace = truncateSize(stackInfo.stackString)
  } else {
    params.browser_stack_hash = stringHashCode(stackInfo.stackString)
  }
  params.releaseIds = stringify(config.runtime.releaseIds)

  // When debugging stack canonicalization/hashing, uncomment these lines for
  // more output in the test logs
  // params.origStack = err.stack
  // params.canonicalStack = canonicalStack

  var hash = nameHash(params)

  if (!pageviewReported[hash]) {
    params.pageview = 1
    pageviewReported[hash] = true
  }

  var type = internal ? 'ierr' : 'err'
  var newMetrics = { time: time }

  // stn and spa aggregators listen to this event - stn sends the error in its payload,
  // and spa annotates the error with interaction info
  ;(0,handle/* handle */.pr)('errorAgg', [type, hash, params, newMetrics])

  if (params._interactionId != null) {
    // hold on to the error until the interaction finishes
    errorCache[params._interactionId] = errorCache[params._interactionId] || []
    errorCache[params._interactionId].push([type, hash, params, newMetrics, att, customAttributes])
  } else {
    // store custom attributes
    var customParams = {}
    var att = (0,config.getInfo)().jsAttributes
    ;(0,map_own/* mapOwn */.D)(att, setCustom)
    if (customAttributes) {
      (0,map_own/* mapOwn */.D)(customAttributes, setCustom)
    }

    var jsAttributesHash = stringHashCode(stringify(customParams))
    var aggregateHash = hash + ':' + jsAttributesHash
    storeEventMetrics(type, aggregateHash, params, newMetrics, customParams)
  }

  function setCustom (key, val) {
    customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
  }
}

contextual_ee.ee.on('interactionSaved', function (interaction) {
  if (!errorCache[interaction.id]) return

  errorCache[interaction.id].forEach(function (item) {
    var customParams = {}
    var globalCustomParams = item[4]
    var localCustomParams = item[5]

    ;(0,map_own/* mapOwn */.D)(globalCustomParams, setCustom)
    ;(0,map_own/* mapOwn */.D)(interaction.root.attrs.custom, setCustom)
    ;(0,map_own/* mapOwn */.D)(localCustomParams, setCustom)

    var params = item[2]
    params.browserInteractionId = interaction.root.attrs.id
    delete params._interactionId

    if (params._interactionNodeId) {
      params.parentNodeId = params._interactionNodeId.toString()
      delete params._interactionNodeId
    }

    var hash = item[1] + interaction.root.attrs.id
    var jsAttributesHash = stringHashCode(stringify(customParams))
    var aggregateHash = hash + ':' + jsAttributesHash

    storeEventMetrics(item[0], aggregateHash, params, item[3], customParams)

    function setCustom (key, val) {
      customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  })
  delete errorCache[interaction.id]
})

contextual_ee.ee.on('interactionDiscarded', function (interaction) {
  if (!errorCache[interaction.id]) return

  errorCache[interaction.id].forEach(function (item) {
    var customParams = {}
    var globalCustomParams = item[4]
    var localCustomParams = item[5]

    ;(0,map_own/* mapOwn */.D)(globalCustomParams, setCustom)
    ;(0,map_own/* mapOwn */.D)(interaction.root.attrs.custom, setCustom)
    ;(0,map_own/* mapOwn */.D)(localCustomParams, setCustom)

    var params = item[2]
    delete params._interactionId
    delete params._interactionNodeId

    var hash = item[1]
    var jsAttributesHash = stringHashCode(stringify(customParams))
    var aggregateHash = hash + ':' + jsAttributesHash

    storeEventMetrics(item[0], aggregateHash, item[2], item[3], customParams)

    function setCustom (key, val) {
      customParams[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }
  })
  delete errorCache[interaction.id]
})


/***/ }),

/***/ 857:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "initialize": () => (/* binding */ initialize)
});

// EXTERNAL MODULE: ../../modules/common/event-emitter/handle.js
var handle = __webpack_require__(108);
// EXTERNAL MODULE: ../../modules/common/event-emitter/contextual-ee.js
var contextual_ee = __webpack_require__(75);
// EXTERNAL MODULE: ../../modules/common/config/config.js
var config = __webpack_require__(756);
// EXTERNAL MODULE: ../../modules/common/timing/now.js + 1 modules
var now = __webpack_require__(858);
// EXTERNAL MODULE: ../../modules/common/util/get-or-set.js
var get_or_set = __webpack_require__(995);
// EXTERNAL MODULE: ../../node_modules/lodash._slice/index.js
var lodash_slice = __webpack_require__(454);
var lodash_slice_default = /*#__PURE__*/__webpack_require__.n(lodash_slice);
// EXTERNAL MODULE: ../../modules/common/util/map-own.js
var map_own = __webpack_require__(343);
;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-fetch.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */





var ee = contextual_ee/* global.get */.C.get('fetch')

/* harmony default export */ const wrap_fetch = ((/* unused pure expression or super */ null && (ee)));


var win = window
var prefix = 'fetch-'
var bodyPrefix = prefix + 'body-'
var bodyMethods = (/* unused pure expression or super */ null && (['arrayBuffer', 'blob', 'json', 'text', 'formData']))
var Req = win.Request
var Res = win.Response
// var fetch = win.fetch
var proto = 'prototype'
var ctxId = 'nr@context'

function wrapGlobal() {
  // since these are prototype methods, we can only wrap globally
  mapOwn(bodyMethods, function (i, name) {
    wrapPromiseMethod(ee, Req[proto], name, bodyPrefix)
    wrapPromiseMethod(ee, Res[proto], name, bodyPrefix)
  })

  var wrappedFetch = wrapFetch(ee)
  win.fetch = wrappedFetch
}

function wrapFetch(ee) {
  var fn = originals.FETCH

  var wrappedFetch = wrapPromiseMethod(ee, fn, prefix)

  ee.on(prefix + 'end', function (err, res) {
    var ctx = this
    if (res) {
      var size = res.headers.get('content-length')
      if (size !== null) {
        ctx.rxSize = size
      }
      ee.emit(prefix + 'done', [null, res], ctx)
    } else {
      ee.emit(prefix + 'done', [err], ctx)
    }
  })

  return wrappedFetch
}

// this should probably go to the common module as a part of wrapping utility functions
function wrapPromiseMethod(ee, fn, prefix) {
  return function nrWrapper() {
    var args = slice(arguments)

    var ctx = {}
    // we are wrapping args in an array so we can preserve the reference
    ee.emit(prefix + 'before-start', [args], ctx)
    var dtPayload
    if (ctx[ctxId] && ctx[ctxId].dt) dtPayload = ctx[ctxId].dt

    var promise = fn.apply(this, args)

    ee.emit(prefix + 'start', [args, dtPayload], promise)

    return promise.then(function (val) {
      ee.emit(prefix + 'end', [null, val], promise)
      return val
    }, function (err) {
      ee.emit(prefix + 'end', [err], promise)
      throw err
    })
  }
}

;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-function.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */



var flag = 'nr@original'
var has = Object.prototype.hasOwnProperty
var inWrapper = false

/* harmony default export */ const wrap_function = (createWrapperWithEmitter);

function createWrapperWithEmitter(emitter, always) {
  emitter || (emitter = contextual_ee.ee)

  wrapFn.inPlace = inPlace
  wrapFn.flag = flag

  return wrapFn

  function wrapFn (fn, prefix, getContext, methodName, bubble) {
    // Unless fn is both wrappable and unwrapped, return it unchanged.
    if (notWrappable(fn)) return fn

    if (!prefix) prefix = ''

    nrWrapper[flag] = fn
    copy(fn, nrWrapper, emitter)
    return nrWrapper

    function nrWrapper () {
      var args
      var originalThis
      var ctx
      var result

      try {
        originalThis = this
        args = lodash_slice_default()(arguments)

        if (typeof getContext === 'function') {
          ctx = getContext(args, originalThis)
        } else {
          ctx = getContext || {}
        }
      } catch (e) {
        report([e, '', [args, originalThis, methodName], ctx], emitter)
      }

      // Warning: start events may mutate args!
      safeEmit(prefix + 'start', [args, originalThis, methodName], ctx, bubble)

      try {
        result = fn.apply(originalThis, args)
        return result
      } catch (err) {
        safeEmit(prefix + 'err', [args, originalThis, err], ctx, bubble)

        // rethrow error so we don't effect execution by observing.
        throw err
      } finally {
        // happens no matter what.
        safeEmit(prefix + 'end', [args, originalThis, result], ctx, bubble)
      }
    }
  }

  function inPlace (obj, methods, prefix, getContext, bubble) {
    // console.log('methods!', methods)
    if (!prefix) prefix = ''
    // If prefix starts with '-' set this boolean to add the method name to
    // the prefix before passing each one to wrap.
    var prependMethodPrefix = (prefix.charAt(0) === '-')
    var fn
    var method
    var i

    for (i = 0; i < methods.length; i++) {
      method = methods[i]
      fn = obj[method]

      // Unless fn is both wrappable and unwrapped bail,
      // so we don't add extra properties with undefined values.
      if (notWrappable(fn)) continue

      obj[method] = wrapFn(fn, (prependMethodPrefix ? method + prefix : prefix), getContext, method, bubble)
    }
  }

  function safeEmit (evt, arr, store, bubble) {
    if (inWrapper && !always) return
    var prev = inWrapper
    inWrapper = true
    try {
      emitter.emit(evt, arr, store, always, bubble)
    } catch (e) {
      report([e, evt, arr, store], emitter)
    }
    inWrapper = prev
  }
}

function report (args, emitter) {
  emitter || (emitter = contextual_ee.ee)
  try {
    emitter.emit('internal-error', args)
  } catch (err) {}
}

function copy (from, to, emitter) {
  if (Object.defineProperty && Object.keys) {
    // Create accessors that proxy to actual function
    try {
      var keys = Object.keys(from)
      keys.forEach(function (key) {
        Object.defineProperty(to, key, {
          get: function () { return from[key] },
          set: function (val) { from[key] = val; return val }
        })
      })
      return to
    } catch (e) {
      report([e], emitter)
    }
  }
  // fall back to copying properties
  for (var i in from) {
    if (has.call(from, i)) {
      to[i] = from[i]
    }
  }
  return to
}

function notWrappable (fn) {
  return !(fn && fn instanceof Function && fn.apply && !fn[flag])
}

function wrapFunction(fn, wrapper) {
  var wrapped = wrapper(fn)
  wrapped[flag] = fn
  copy(fn, wrapped, contextual_ee.ee)
  return wrapped
}

function wrapInPlace(obj, fnName, wrapper) {
  var fn = obj[fnName]
  obj[fnName] = wrapFunction(fn, wrapper)
}

function argsToArray() {
  var len = arguments.length
  var arr = new Array(len)
  for (var i = 0; i < len; ++i) {
    arr[i] = arguments[i]
  }
  return arr
}

;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-timer.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */



var wrap_timer_ee = contextual_ee/* global.get */.C.get('timer')
var wrapFn = createWrapperWithEmitter(wrap_timer_ee)

var SET_TIMEOUT = 'setTimeout'
var SET_INTERVAL = 'setInterval'
var CLEAR_TIMEOUT = 'clearTimeout'
var START = '-start'
var DASH = '-'

/* harmony default export */ const wrap_timer = (wrap_timer_ee);

// console.log('wrap timer...')
wrapFn.inPlace(window, [SET_TIMEOUT, 'setImmediate'], SET_TIMEOUT + DASH)
wrapFn.inPlace(window, [SET_INTERVAL], SET_INTERVAL + DASH)
wrapFn.inPlace(window, [CLEAR_TIMEOUT, 'clearImmediate'], CLEAR_TIMEOUT + DASH)

wrap_timer_ee.on(SET_INTERVAL + START, interval)
wrap_timer_ee.on(SET_TIMEOUT + START, timer)

function interval (args, obj, type) {
  args[0] = wrapFn(args[0], 'fn-', null, type)
}

function timer (args, obj, type) {
  this.method = type
  this.timerDuration = isNaN(args[1]) ? 0 : +args[1]
  args[0] = wrapFn(args[0], 'fn-', this, type)
}

;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-raf.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Request Animation Frame wrapper


var wrap_raf_ee = contextual_ee/* global.get */.C.get('raf')
var wrap_raf_wrapFn = createWrapperWithEmitter(wrap_raf_ee)

var equestAnimationFrame = 'equestAnimationFrame'

/* harmony default export */ const wrap_raf = (wrap_raf_ee);

wrap_raf_wrapFn.inPlace(window, [
  'r' + equestAnimationFrame,
  'mozR' + equestAnimationFrame,
  'webkitR' + equestAnimationFrame,
  'msR' + equestAnimationFrame
], 'raf-')

wrap_raf_ee.on('raf-start', function (args) {
  // Wrap the callback handed to requestAnimationFrame
  args[0] = wrap_raf_wrapFn(args[0], 'fn-')
})

;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-history.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// History pushState wrapper


var wrap_history_ee = contextual_ee/* global.get */.C.get('history')
var wrap_history_wrapFn = createWrapperWithEmitter(wrap_history_ee)

/* harmony default export */ const wrap_history = ((/* unused pure expression or super */ null && (wrap_history_ee)));

var wrap_history_prototype = window.history && window.history.constructor && window.history.constructor.prototype
var object = window.history
if (wrap_history_prototype && wrap_history_prototype.pushState && wrap_history_prototype.replaceState) {
  object = wrap_history_prototype
}
// console.log('wrap history')
wrap_history_wrapFn.inPlace(object, [ 'pushState', 'replaceState' ], '-')

// EXTERNAL MODULE: ../../modules/common/event-listener/event-listener-opts.js
var event_listener_opts = __webpack_require__(326);
;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-jsonp.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */





var wrap_jsonp_ee = contextual_ee/* global.get */.C.get('jsonp')
var wrap_jsonp_wrapFn = createWrapperWithEmitter(wrap_jsonp_ee)

/* harmony default export */ const wrap_jsonp = ((/* unused pure expression or super */ null && (wrap_jsonp_ee)));

var CALLBACK_REGEX = /[?&](?:callback|cb)=([^&#]+)/
var PARENT_REGEX = /(.*)\.([^.]+)/
var VALUE_REGEX = /^(\w+)(\.|$)(.*)$/
var domInsertMethods = ['appendChild', 'insertBefore', 'replaceChild']

if (shouldWrap()) {
  wrap_jsonp_wrap()
}

function wrap_jsonp_wrap() {
  // console.log('wrap jsonp...')
  // JSONP works by dynamically inserting <script> elements - wrap DOM methods for
  // inserting elements to detect insertion of JSONP-specific elements.
  if (Node && Node.prototype && Node.prototype.appendChild) {
    // console.log('domInsertMethods', domInsertMethods)
    wrap_jsonp_wrapFn.inPlace(Node.prototype, domInsertMethods, 'dom-')
  } else {
    wrap_jsonp_wrapFn.inPlace(HTMLElement.prototype, domInsertMethods, 'dom-')
    wrap_jsonp_wrapFn.inPlace(HTMLHeadElement.prototype, domInsertMethods, 'dom-')
    wrap_jsonp_wrapFn.inPlace(HTMLBodyElement.prototype, domInsertMethods, 'dom-')
  }
}

wrap_jsonp_ee.on('dom-start', function (args) {
  wrapElement(args[0])
})

// subscribe to events on the JSONP <script> element and wrap the JSONP callback
// in order to track start and end of the interaction node
function wrapElement (el) {
  // console.log('wrapElement')
  var isScript = el && typeof el.nodeName === 'string' &&
    el.nodeName.toLowerCase() === 'script'
  if (!isScript) return

  var isValidElement = typeof el.addEventListener === 'function'
  if (!isValidElement) return

  var callbackName = extractCallbackName(el.src)
  if (!callbackName) return

  var callback = discoverParent(callbackName)
  var validCallback = typeof callback.parent[callback.key] === 'function'
  if (!validCallback) return

  // At this point we know that the element is a valid JSONP script element.
  // The following events are emitted during the lifetime of a JSONP call:
  // * immediately emit `new-jsonp` to notify start of the JSONP work
  // * the wrapped callback will emit `cb-start` and `cb-end` during the execution
  //   of the callback, here we can inspect the response
  // * when the element emits the `load` event (script loaded and executed),
  //   emit `jsonp-end` to notify end of the JSONP work
  // * if the element emits the `error` event, in response emit `jsonp-error`
  //   (and `jsonp-end`). Note that the callback in this case will likely not get
  //   called.

  var context = {}
  // console.log('wrap jsonp...')
  // console.log('callback.key', callback.key)
  wrap_jsonp_wrapFn.inPlace(callback.parent, [callback.key], 'cb-', context)

  el.addEventListener('load', onLoad, (0,event_listener_opts/* eventListenerOpts */.m)(false))
  el.addEventListener('error', onError, (0,event_listener_opts/* eventListenerOpts */.m)(false))
  wrap_jsonp_ee.emit('new-jsonp', [el.src], context)

  function onLoad () {
    wrap_jsonp_ee.emit('jsonp-end', [], context)
    el.removeEventListener('load', onLoad, (0,event_listener_opts/* eventListenerOpts */.m)(false))
    el.removeEventListener('error', onError, (0,event_listener_opts/* eventListenerOpts */.m)(false))
  }

  function onError () {
    wrap_jsonp_ee.emit('jsonp-error', [], context)
    wrap_jsonp_ee.emit('jsonp-end', [], context)
    el.removeEventListener('load', onLoad, (0,event_listener_opts/* eventListenerOpts */.m)(false))
    el.removeEventListener('error', onError, (0,event_listener_opts/* eventListenerOpts */.m)(false))
  }
}

function shouldWrap () {
  return 'addEventListener' in window
}

function extractCallbackName (src) {
  var matches = src.match(CALLBACK_REGEX)
  return matches ? matches[1] : null
}

function discoverValue (longKey, obj) {
  var matches = longKey.match(VALUE_REGEX)
  var key = matches[1]
  var remaining = matches[3]
  if (!remaining) {
    return obj[key]
  }
  return discoverValue(remaining, obj[key])
}

function discoverParent (key) {
  var matches = key.match(PARENT_REGEX)
  if (matches && matches.length >= 3) {
    return {
      key: matches[2],
      parent: discoverValue(matches[1], window)
    }
  }
  return {
    key: key,
    parent: window
  }
}

;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-mutation.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */




var wrap_mutation_ee = contextual_ee/* global.get */.C.get('mutation')
var wrap_mutation_wrapFn = createWrapperWithEmitter(wrap_mutation_ee)
var OriginalObserver = config.originals.MO

/* harmony default export */ const wrap_mutation = ((/* unused pure expression or super */ null && (wrap_mutation_ee)));

if (OriginalObserver) {
  window.MutationObserver = function WrappedMutationObserver (cb) {
    if (this instanceof OriginalObserver) {
      return new OriginalObserver(wrap_mutation_wrapFn(cb, 'fn-'))
    } else {
      return OriginalObserver.apply(this, arguments)
    }
  }

  MutationObserver.prototype = OriginalObserver.prototype
}

;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-promise.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */




var promiseEE = contextual_ee/* global.get */.C.get('promise')
var getContext = contextual_ee/* getOrSetContext */.c
var promiseWrapper = createWrapperWithEmitter(promiseEE)
var OriginalPromise = config.originals.PR

/* harmony default export */ const wrap_promise = ((/* unused pure expression or super */ null && (promiseEE)));

if (OriginalPromise) {
  wrap_promise_wrap()
}

function wrap_promise_wrap() {
  window.Promise = WrappedPromise

  ;['all', 'race'].forEach(function (method) {
    var original = OriginalPromise[method]
    OriginalPromise[method] = function (subPromises) {
      var finalized = false
      ;(0,map_own/* mapOwn */.D)(subPromises, function (i, sub) {
        Promise.resolve(sub).then(setNrId(method === 'all'), setNrId(false))
      })

      var originalReturnValue = original.apply(OriginalPromise, arguments)
      var promise = OriginalPromise.resolve(originalReturnValue)

      return promise

      function setNrId (overwrite) {
        return function () {
          promiseEE.emit('propagate', [null, !finalized], originalReturnValue, false, false)
          finalized = finalized || !overwrite
        }
      }
    }
  })

  ;['resolve', 'reject'].forEach(function (method) {
    var original = OriginalPromise[method]
    OriginalPromise[method] = function (val) {
      var returnVal = original.apply(OriginalPromise, arguments)
      if (val !== returnVal) {
        promiseEE.emit('propagate', [val, true], returnVal, false, false)
      }

      return returnVal
    }
  })

  OriginalPromise.prototype['catch'] = function wrappedCatch (fn) {
    return this.then(null, fn)
  }

  Object.assign(OriginalPromise.prototype, {constructor: {value: WrappedPromise}})
  // OriginalPromise.prototype = Object.create(OriginalPromise.prototype, {
  //   constructor: {value: WrappedPromise}
  // })

  ;(0,map_own/* mapOwn */.D)(Object.getOwnPropertyNames(OriginalPromise), function copy (i, key) {
    try {
      WrappedPromise[key] = OriginalPromise[key]
    } catch (err) {
      // ignore properties we can't copy
    }
  })

  function WrappedPromise (executor) {
    var ctx = promiseEE.context()
    var wrappedExecutor = promiseWrapper(executor, 'executor-', ctx, null, false)

    var promise = new OriginalPromise(wrappedExecutor)

    promiseEE.context(promise).getCtx = function () {
      return ctx
    }

    return promise
  }

  wrapInPlace(OriginalPromise.prototype, 'then', function wrapThen(original) {
    return function wrappedThen() {
      var originalThis = this
      var args = argsToArray.apply(this, arguments)

      var ctx = getContext(originalThis)
      ctx.promise = originalThis
      args[0] = promiseWrapper(args[0], 'cb-', ctx, null, false)
      args[1] = promiseWrapper(args[1], 'cb-', ctx, null, false)

      var result = original.apply(this, args)

      ctx.nextPromise = result
      promiseEE.emit('propagate', [originalThis, true], result, false, false)

      return result
    }
  })

  promiseEE.on('executor-start', function (args) {
    args[0] = promiseWrapper(args[0], 'resolve-', this, null, false)
    args[1] = promiseWrapper(args[1], 'resolve-', this, null, false)
  })

  promiseEE.on('executor-err', function (args, originalThis, err) {
    args[1](err)
  })

  promiseEE.on('cb-end', function (args, originalThis, result) {
    promiseEE.emit('propagate', [result, true], this.nextPromise, false, false)
  })

  promiseEE.on('propagate', function (val, overwrite, trigger) {
    if (!this.getCtx || overwrite) {
      this.getCtx = function () {
        if (val instanceof Promise) {
          var store = promiseEE.context(val)
        }

        return store && store.getCtx ? store.getCtx() : this
      }
    }
  })

  WrappedPromise.toString = function () {
    return '' + OriginalPromise
  }
}

;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-events.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// console.log('wrap events!')



var wrap_events_ee = contextual_ee/* global.get */.C.get('events')
var wrap_events_wrapFn = createWrapperWithEmitter(wrap_events_ee, true)

var XHR = XMLHttpRequest
var ADD_EVENT_LISTENER = 'addEventListener'
var REMOVE_EVENT_LISTENER = 'removeEventListener'

/* harmony default export */ const wrap_events = (wrap_events_ee);

// Guard against instrumenting environments w/o necessary features
if ('getPrototypeOf' in Object) {
  findAndWrapNode(document)
  findAndWrapNode(window)
  findAndWrapNode(XHR.prototype)
} else if (XHR.prototype.hasOwnProperty(ADD_EVENT_LISTENER)) {
  wrapNode(window)
  wrapNode(XHR.prototype)
}

wrap_events_ee.on(ADD_EVENT_LISTENER + '-start', function (args, target) {
  var originalListener = args[1]
  if (originalListener === null ||
    (typeof originalListener !== 'function' && typeof originalListener !== 'object')
  ) {
    return
  }

  var wrapped = (0,get_or_set/* getOrSet */.X)(originalListener, 'nr@wrapped', function () {
    var listener = {
      object: wrapHandleEvent,
      'function': originalListener
    }[typeof originalListener]

    return listener ? wrap_events_wrapFn(listener, 'fn-', null, (listener.name || 'anonymous')) : originalListener

    function wrapHandleEvent () {
      if (typeof originalListener.handleEvent !== 'function') return
      return originalListener.handleEvent.apply(originalListener, arguments)
    }
  })

  this.wrapped = args[1] = wrapped
})

wrap_events_ee.on(REMOVE_EVENT_LISTENER + '-start', function (args) {
  args[1] = this.wrapped || args[1]
})

function findAndWrapNode (object) {
  var step = object
  while (step && !step.hasOwnProperty(ADD_EVENT_LISTENER)) { step = Object.getPrototypeOf(step) }
  if (step) { wrapNode(step) }
}

function wrapNode (node) {
  // console.log('wrap events...')
  wrap_events_wrapFn.inPlace(node, [ADD_EVENT_LISTENER, REMOVE_EVENT_LISTENER], '-', uniqueListener)
}

function uniqueListener (args, obj) {
  // Context for the listener is stored on itself.
  return args[1]
}

;// CONCATENATED MODULE: ../../modules/common/wrap/wrap-xhr.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// wrap-events patches XMLHttpRequest.prototype.addEventListener for us.

// import * as config from '../config'





var baseEE = contextual_ee/* global */.C
var wrap_xhr_ee = baseEE.get('xhr')
var wrap_xhr_wrapFn = createWrapperWithEmitter(wrap_xhr_ee)

var OrigXHR = config.originals.XHR
var wrap_xhr_MutationObserver = config.originals.MO
var wrap_xhr_Promise = config.originals.PR
var setImmediate = config.originals.SI

var READY_STATE_CHANGE = 'readystatechange'

var handlers = ['onload', 'onerror', 'onabort', 'onloadstart', 'onloadend', 'onprogress', 'ontimeout']
var pendingXhrs = []

/* harmony default export */ const wrap_xhr = (wrap_xhr_ee);

var wrap_xhr_XHR = window.XMLHttpRequest = function (opts) {
  var xhr = new OrigXHR(opts)
  try {
    wrap_xhr_ee.emit('new-xhr', [xhr], xhr)
    xhr.addEventListener(READY_STATE_CHANGE, wrapXHR, (0,event_listener_opts/* eventListenerOpts */.m)(false))
  } catch (e) {
    try {
      wrap_xhr_ee.emit('internal-error', [e])
    } catch (err) {}
  }
  return xhr
}

wrap_xhr_copy(OrigXHR, wrap_xhr_XHR)

wrap_xhr_XHR.prototype = OrigXHR.prototype

// console.log('wrap xhr...')
wrap_xhr_wrapFn.inPlace(wrap_xhr_XHR.prototype, ['open', 'send'], '-xhr-', getObject)

wrap_xhr_ee.on('send-xhr-start', function (args, xhr) {
  wrapOnreadystatechange(args, xhr)
  enqueuePendingXhr(xhr)
})
wrap_xhr_ee.on('open-xhr-start', wrapOnreadystatechange)

function wrapOnreadystatechange (args, xhr) {
  wrap_xhr_wrapFn.inPlace(xhr, ['onreadystatechange'], 'fn-', getObject)
}

function wrapXHR () {
  var xhr = this
  var ctx = wrap_xhr_ee.context(xhr)

  if (xhr.readyState > 3 && !ctx.resolved) {
    ctx.resolved = true
    wrap_xhr_ee.emit('xhr-resolved', [], xhr)
  }

  wrap_xhr_wrapFn.inPlace(xhr, handlers, 'fn-', getObject)
}

// Wrapping the onreadystatechange property of XHRs takes some special tricks.
//
// The issue is that the onreadystatechange property may be assigned *after*
// send() is called against an XHR. This is of particular importance because
// jQuery uses a single onreadystatechange handler to implement all of the XHR
// callbacks thtat it provides, and it assigns that property after calling send.
//
// There are several 'obvious' approaches to wrapping the onreadystatechange
// when it's assigned after send:
//
// 1. Try to wrap the onreadystatechange handler from a readystatechange
//    addEventListener callback (the addEventListener callback will fire before
//    the onreadystatechange callback).
//
//      Caveat: this doesn't work in Chrome or Safari, and in fact will cause
//      the onreadystatechange handler to not be invoked at all during the
//      firing cycle in which it is wrapped, which may break applications :(
//
// 2. Use Object.defineProperty to create a setter for the onreadystatechange
//    property, and wrap from that setter.
//
//      Caveat: onreadystatechange is not a configurable property in Safari or
//      older versions of the Android browser.
//
// 3. Schedule wrapping of the onreadystatechange property using a setTimeout
//    call issued just before the call to send.
//
//      Caveat: sometimes, the onreadystatechange handler fires before the
//      setTimeout, meaning the wrapping happens too late.
//
// The setTimeout approach is closest to what we use here: we want to schedule
// the wrapping of the onreadystatechange property when send is called, but
// ensure that our wrapping happens before onreadystatechange has a chance to
// fire.
//
// We achieve this using a hybrid approach:
//
// * In browsers that support MutationObserver, we use that to schedule wrapping
//   of onreadystatechange.
//
// * We have discovered that MutationObserver in IE causes a memory leak, so we
//   now will prefer setImmediate for IE, and use a resolved promise to schedule
//   the wrapping in Edge (and other browsers that support promises)
//
// * In older browsers that don't support MutationObserver, we rely on the fact
//   that the call to send is probably happening within a callback that we've
//   already wrapped, and use our existing fn-end event callback to wrap the
//   onreadystatechange at the end of the current callback.
//

if (wrap_xhr_MutationObserver) {
  var resolved = wrap_xhr_Promise && wrap_xhr_Promise.resolve()
  if (!setImmediate && !wrap_xhr_Promise) {
    var toggle = 1
    var dummyNode = document.createTextNode(toggle)
    new wrap_xhr_MutationObserver(drainPendingXhrs).observe(dummyNode, { characterData: true })
  }
} else {
  baseEE.on('fn-end', function (args) {
    // We don't want to try to wrap onreadystatechange from within a
    // readystatechange callback.
    if (args[0] && args[0].type === READY_STATE_CHANGE) return
    drainPendingXhrs()
  })
}

function enqueuePendingXhr (xhr) {
  pendingXhrs.push(xhr)
  if (wrap_xhr_MutationObserver) {
    if (resolved) {
      resolved.then(drainPendingXhrs)
    } else if (setImmediate) {
      setImmediate(drainPendingXhrs)
    } else {
      toggle = -toggle
      dummyNode.data = toggle
    }
  }
}

function drainPendingXhrs () {
  for (var i = 0; i < pendingXhrs.length; i++) {
    wrapOnreadystatechange([], pendingXhrs[i])
  }
  if (pendingXhrs.length) pendingXhrs = []
}

// Use the object these methods are on as their
// context store for the event emitter
function getObject (args, obj) {
  return obj
}

function wrap_xhr_copy (from, to) {
  for (var i in from) {
    to[i] = from[i]
  }
  return to
}

;// CONCATENATED MODULE: ../../modules/common/wrap/index.js















function wrapGlobalEvents() {
  return wrap_events
}

function wrap_wrapFetch(ee) {
  // return import('./wrap-fetch').then(module => module.wrap(ee))
  wrap(ee)
}

function wrapHistory() {
  return wh
}

function wrapJson() {
  return wj
}

function wrapMutation() {
  return wm
}

function wrapPromise() {
  return wp
}

function wrapRaf() {
  return wrap_raf
}

function wrapTimer() {
  return wrap_timer
}

function wrapXhr() {
  return wrap_xhr
}

;// CONCATENATED MODULE: ../../modules/features/js-errors/instrument/debug.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */




var flags = {}
var flagArr

try {
  flagArr = localStorage.getItem('__nr_flags').split(',')
  if (console && typeof console.log === 'function') {
    flags.console = true
    if (flagArr.indexOf('dev') !== -1) flags.dev = true
    if (flagArr.indexOf('nr_dev') !== -1) flags.nrDev = true
  }
} catch (err) {
  // no op
}

if (flags.nrDev) contextual_ee.ee.on('internal-error', function (err) { log(err.stack) })
if (flags.dev) contextual_ee.ee.on('fn-err', function (args, origThis, err) { log(err.stack) })
if (flags.dev) {
  log('NR AGENT IN DEVELOPMENT MODE')
  log('flags: ' + (0,map_own/* mapOwn */.D)(flags, function (key, val) { return key }).join(', '))
}

function log (message) {
  try {
    if (flags.console) console.log(message)
  } catch (err) {
    // no op
  }
}

;// CONCATENATED MODULE: ../../modules/features/js-errors/instrument/index.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */










var origOnerror = window.onerror
var handleErrors = false
var NR_ERR_PROP = 'nr@seenError'

// skipNext counter to keep track of uncaught
// errors that will be the same as caught errors.
var skipNext = 0

// export default {
//   initialize: initialize
// }

function initialize() {
  // Declare that we are using err instrumentation
  // require('./debug')

  window.onerror = onerrorHandler

  try {
    throw new Error()
  } catch (e) {
    // Only wrap stuff if try/catch gives us useful data. It doesn't in IE < 10.
    if ('stack' in e) {
      wrapTimer()
      wrapRaf()

      if ('addEventListener' in window) {
        wrapGlobalEvents()
      }

      if (config.runtime.xhrWrappable) {
        wrapXhr()
      }

      handleErrors = true
    }
  }
}

contextual_ee/* global.on */.C.on('fn-start', function (args, obj, methodName) {
  if (handleErrors) skipNext += 1
})

contextual_ee/* global.on */.C.on('fn-err', function (args, obj, err) {
  if (handleErrors && !err[NR_ERR_PROP]) {
    (0,get_or_set/* getOrSet */.X)(err, NR_ERR_PROP, function getVal () {
      return true
    })
    this.thrown = true
    notice(err)
  }
})

contextual_ee/* global.on */.C.on('fn-end', function () {
  if (!handleErrors) return
  if (!this.thrown && skipNext > 0) skipNext -= 1
})

contextual_ee/* global.on */.C.on('internal-error', function (e) {
  ;(0,handle/* global */.CO)('ierr', [e, (0,now/* now */.zO)(), true])
})

// FF and Android browsers do not provide error info to the 'error' event callback,
// so we must use window.onerror
function onerrorHandler (message, filename, lineno, column, errorObj) {
  try {
    if (skipNext) skipNext -= 1
    else notice(errorObj || new UncaughtException(message, filename, lineno), true)
  } catch (e) {
    try {
      (0,handle/* global */.CO)('ierr', [e, (0,now/* now */.zO)(), true])
    } catch (err) {
    }
  }

  if (typeof origOnerror === 'function') return origOnerror.apply(this, lodash_slice_default()(arguments))
  return false
}

function UncaughtException (message, filename, lineno) {
  this.message = message || 'Uncaught error with no additional information'
  this.sourceURL = filename
  this.line = lineno
}

// emits 'handle > error' event, which the error aggregator listens on
function notice (err, doNotStamp) {
  // by default add timestamp, unless specifically told not to
  // this is to preserve existing behavior
  var time = (!doNotStamp) ? (0,now/* now */.zO)() : null
  ;(0,handle/* global */.CO)('err', [err, time])
}


/***/ }),

/***/ 454:
/***/ ((module) => {

/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/**
 * Slices the `collection` from the `start` index up to, but not including,
 * the `end` index.
 *
 * Note: This function is used instead of `Array#slice` to support node lists
 * in IE < 9 and to ensure dense arrays are returned.
 *
 * @private
 * @param {Array|Object|string} collection The collection to slice.
 * @param {number} start The start index.
 * @param {number} end The end index.
 * @returns {Array} Returns the new array.
 */
function slice(array, start, end) {
  start || (start = 0);
  if (typeof end == 'undefined') {
    end = array ? array.length : 0;
  }
  var index = -1,
      length = end - start || 0,
      result = Array(length < 0 ? 0 : length);

  while (++index < length) {
    result[index] = array[start + index];
  }
  return result;
}

module.exports = slice;


/***/ }),

/***/ 590:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.init = void 0;
var config_1 = __webpack_require__(756);
var ie_version_1 = __webpack_require__(283);
var types_1 = __webpack_require__(985);
var api_defaults_1 = __webpack_require__(34);
if (ie_version_1.ieVersion === 6)
    config_1.runtime.maxBytes = 2000;
else
    config_1.runtime.maxBytes = 30000;
var initialized = false;
var _enabledFeatures = [
    types_1.NrFeatures.AJAX, types_1.NrFeatures.JSERRORS, types_1.NrFeatures.PAGE_VIEW_EVENT, types_1.NrFeatures.PAGE_VIEW_TIMING
];
// let _disabledFeatures: NrFeatures[] = []
var nr = {
    disable: function (features) {
        if (initialized)
            return console.error("Features must be disabled before starting the NR Agent");
        if (Array.isArray(features))
            _enabledFeatures = _enabledFeatures.filter(function (f) { return !features.includes(f); });
        else
            _enabledFeatures = _enabledFeatures.filter(function (f) { return features !== f; });
    },
    get features() {
        return _enabledFeatures;
    },
    start: initialize,
    storeError: api_defaults_1.storeError
};
exports["default"] = nr;
function initialize(_a) {
    var info = _a.info, config = _a.config, loader_config = _a.loader_config;
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (initialized)
                        return [2 /*return*/];
                    (0, config_1.setInfo)(info);
                    if (config)
                        (0, config_1.setConfiguration)(config);
                    if (loader_config)
                        (0, config_1.setLoaderConfig)(config);
                    return [4 /*yield*/, initializeFeatures()];
                case 1:
                    _b.sent();
                    initialized = true;
                    return [4 /*yield*/, (0, api_defaults_1.initialize)(_enabledFeatures)];
                case 2:
                    _b.sent();
                    console.log("initialized API!");
                    return [2 /*return*/];
            }
        });
    });
}
exports.init = initialize;
function initializeFeatures() {
    var _this = this;
    return Promise.all(_enabledFeatures.map(function (feature) { return __awaiter(_this, void 0, void 0, function () {
        var initializeInstrument, initializeAggregate;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(feature === types_1.NrFeatures.JSERRORS)) return [3 /*break*/, 3];
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(__webpack_require__(857)); })];
                case 1:
                    initializeInstrument = (_a.sent()).initialize;
                    initializeInstrument();
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(__webpack_require__(623)); })];
                case 2:
                    initializeAggregate = (_a.sent()).initialize;
                    initializeAggregate(true);
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); }));
}


/***/ }),

/***/ 985:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NrFeatures = void 0;
var NrFeatures;
(function (NrFeatures) {
    NrFeatures["JSERRORS"] = "JSERRORS";
    NrFeatures["AJAX"] = "AJAX";
    NrFeatures["PAGE_VIEW_EVENT"] = "PAGE_VIEW_EVENT";
    NrFeatures["PAGE_VIEW_TIMING"] = "PAGE_VIEW_TIMING";
})(NrFeatures = exports.NrFeatures || (exports.NrFeatures = {}));


/***/ }),

/***/ 34:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.storeError = exports.initialize = void 0;
var types_1 = __webpack_require__(985);
// export function recordError(err: string | Error, customAttributes, time) {
//     if (typeof err === 'string') err = new Error(err)
//     recordSupportability('API/noticeError/called')
//     time = time || now()
//     handle('err', [err, time, false, customAttributes])
//   }
// export function recordPageAction() {
// }
var initialized = false;
var api = {
    storeError: null
};
function initialize(features) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            console.log("initialized agent! Setting up API!");
            initialized = true;
            return [2 /*return*/, Promise.all(features.map(function (feature) { return __awaiter(_this, void 0, void 0, function () {
                    var storeError_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!(feature === types_1.NrFeatures.JSERRORS)) return [3 /*break*/, 2];
                                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(__webpack_require__(623)); })];
                            case 1:
                                storeError_1 = (_a.sent()).storeError;
                                api.storeError = storeError_1;
                                _a.label = 2;
                            case 2: return [2 /*return*/];
                        }
                    });
                }); }))];
        });
    });
}
exports.initialize = initialize;
function storeError(err, time, internal, customAttributes) {
    if (initialized && !!api.storeError)
        return api.storeError(err, time, internal, customAttributes);
    // if the agent has not been started, the source API method will have not been loaded...
    if (!initialized && !api.storeError)
        return notInitialized(types_1.NrFeatures.JSERRORS);
    // if the error feature module is disabled, this function throws a warning message
    if (initialized && !api.storeError)
        return isDisabled(types_1.NrFeatures.JSERRORS, 'storeError');
}
exports.storeError = storeError;
function notInitialized(featureName) {
    console.warn("You are calling a ".concat(featureName, " Feature API, but the Browser Agent has not been started... Please start the agent using .start({...opts})"));
}
function isDisabled(featureName, methodName) {
    console.warn("The ".concat(featureName, " Feature of the New Relic Browser Agent Has Been Disabled. Method \"").concat(methodName, "\" will not do anything!"));
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(590);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=index.js.map