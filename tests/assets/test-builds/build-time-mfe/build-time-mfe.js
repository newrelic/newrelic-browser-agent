(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["container"] = factory();
	else
		root["container"] = factory();
})(self, function() {
return /******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 1990:
/***/ (function(module) {

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

/***/ 8524:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

var map = {
	"./ajax/aggregate": 441,
	"./js-errors/aggregate": 5240,
	"./page-action/aggregate": 6063,
	"./page-view-event/aggregate": 578,
	"./page-view-timing/aggregate": 1095,
	"./session-trace/aggregate": 9782
};

function webpackAsyncContext(req) {
	return Promise.resolve().then(function() {
		if(!__webpack_require__.o(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}

		var id = map[req];
		return __webpack_require__(id);
	});
}
webpackAsyncContext.keys = function() { return Object.keys(map); };
webpackAsyncContext.id = 8524;
module.exports = webpackAsyncContext;

/***/ }),

/***/ 7371:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

var map = {
	"./ajax/instrument": 4539,
	"./js-errors/instrument": 7415,
	"./page-action/instrument": 5877,
	"./page-view-event/instrument": 1200,
	"./page-view-timing/instrument": 1003,
	"./session-trace/instrument": 3013
};

function webpackAsyncContext(req) {
	return Promise.resolve().then(function() {
		if(!__webpack_require__.o(map, req)) {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		}

		var id = map[req];
		return __webpack_require__(id);
	});
}
webpackAsyncContext.keys = function() { return Object.keys(map); };
webpackAsyncContext.id = 7371;
module.exports = webpackAsyncContext;

/***/ }),

/***/ 6062:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "I": function() { return /* binding */ ffVersion; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-useless-escape */
var ffVersion = 0;
var match = navigator.userAgent.match(/Firefox[\/\s](\d+\.\d+)/);
if (match) ffVersion = +match[1]; // export default { ffVersion }

/***/ }),

/***/ 4269:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "H": function() { return /* binding */ ieVersion; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var div = document.createElement('div');
div.innerHTML = '<!--[if lte IE 6]><div></div><![endif]-->' + '<!--[if lte IE 7]><div></div><![endif]-->' + '<!--[if lte IE 8]><div></div><![endif]-->' + '<!--[if lte IE 9]><div></div><![endif]-->';
var len = div.getElementsByTagName('div').length;
var ieVersion;
if (len === 4) ieVersion = 6;else if (len === 3) ieVersion = 7;else if (len === 2) ieVersion = 8;else if (len === 1) ieVersion = 9;else ieVersion = 0;

/***/ }),

/***/ 6271:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "I": function() { return /* binding */ Configurable; }
/* harmony export */ });
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Configurable = /*#__PURE__*/_createClass(function Configurable(obj, model) {
  var _this = this;

  _classCallCheck(this, Configurable);

  if (!obj || _typeof(obj) !== 'object') return console.error('setting a Configurable requires an object as input');
  if (!model || _typeof(model) !== 'object') return console.error('setting a Configurable requires a model to set its initial properties');
  Object.assign(this, model);
  Object.entries(obj).forEach(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        key = _ref2[0],
        value = _ref2[1];

    if (Object.keys(model).includes(key)) _this[key] = value;
  });
});

/***/ }),

/***/ 1525:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "C": function() { return /* binding */ getInfo; },
/* harmony export */   "L": function() { return /* binding */ setInfo; }
/* harmony export */ });
/* harmony import */ var _window_nreum__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2378);
/* harmony import */ var _configurable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6271);


var model = {
  // preset defaults
  beacon: _window_nreum__WEBPACK_IMPORTED_MODULE_0__/* .defaults.beacon */ .ce.beacon,
  errorBeacon: _window_nreum__WEBPACK_IMPORTED_MODULE_0__/* .defaults.errorBeacon */ .ce.errorBeacon,
  // others must be populated by user
  licenseKey: undefined,
  applicationID: undefined,
  sa: undefined,
  queueTime: undefined,
  applicationTime: undefined,
  ttGuid: undefined,
  user: undefined,
  account: undefined,
  product: undefined,
  extra: undefined,
  jsAttributes: {},
  userAttributes: undefined,
  atts: undefined,
  transactionName: undefined,
  tNamePlain: undefined
};
var _cache = {};
function getInfo(id) {
  if (!id) throw new Error('All config objects require an agent identifier!');
  if (!_cache[id]) throw new Error("Info for ".concat(id, " was never set"));
  return _cache[id];
}
function setInfo(id, obj) {
  if (!id) throw new Error('All config objects require an agent identifier!');
  _cache[id] = new _configurable__WEBPACK_IMPORTED_MODULE_1__/* .Configurable */ .I(obj, model);
  (0,_window_nreum__WEBPACK_IMPORTED_MODULE_0__/* .gosNREUMInitializedAgents */ .Qy)(id, _cache[id], 'info');
}

/***/ }),

/***/ 1311:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Dg": function() { return /* binding */ setConfiguration; },
/* harmony export */   "Mt": function() { return /* binding */ getConfigurationValue; },
/* harmony export */   "P_": function() { return /* binding */ getConfiguration; }
/* harmony export */ });
/* harmony import */ var _window_nreum__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2378);
/* harmony import */ var _configurable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6271);
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }



var model = {
  privacy: {
    cookies_enabled: undefined
  },
  ajax: {
    deny_list: undefined
  },
  distributed_tracing: {
    enabled: undefined,
    exclude_newrelic_header: undefined,
    cors_use_newrelic_header: undefined,
    cors_use_tracecontext_headers: undefined,
    allowed_origins: undefined
  },
  page_view_timing: {
    enabled: undefined
  },
  ssl: undefined,
  obfuscate: undefined
};
var _cache = {};
function getConfiguration(id) {
  if (!id) throw new Error('All config objects require an agent identifier!');
  if (!_cache[id]) throw new Error("Configuration for ".concat(id, " was never set"));
  return _cache[id];
}
function setConfiguration(id, obj) {
  if (!id) throw new Error('All config objects require an agent identifier!');
  _cache[id] = new _configurable__WEBPACK_IMPORTED_MODULE_0__/* .Configurable */ .I(obj, model);
  (0,_window_nreum__WEBPACK_IMPORTED_MODULE_1__/* .gosNREUMInitializedAgents */ .Qy)(id, _cache[id], 'config');
}
function getConfigurationValue(id, path) {
  if (!id) throw new Error('All config objects require an agent identifier!');
  var val = getConfiguration(id);

  if (val) {
    var parts = path.split('.');

    for (var i = 0; i < parts.length - 1; i++) {
      val = val[parts[i]];
      if (_typeof(val) !== 'object') return;
    }

    val = val[parts[parts.length - 1]];
  }

  return val;
}

/***/ }),

/***/ 6146:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "D": function() { return /* binding */ getLoaderConfig; },
/* harmony export */   "G": function() { return /* binding */ setLoaderConfig; }
/* harmony export */ });
/* harmony import */ var _window_nreum__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2378);
/* harmony import */ var _configurable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6271);


var model = {
  accountID: undefined,
  trustKey: undefined,
  agentID: undefined,
  licenseKey: undefined,
  applicationID: undefined,
  xpid: undefined
};
var _cache = {};
function getLoaderConfig(id) {
  if (!id) throw new Error('All config objects require an agent identifier!');
  if (!_cache[id]) throw new Error("LoaderConfig for ".concat(id, " was never set"));
  return _cache[id];
}
function setLoaderConfig(id, obj) {
  if (!id) throw new Error('All config objects require an agent identifier!');
  _cache[id] = new _configurable__WEBPACK_IMPORTED_MODULE_0__/* .Configurable */ .I(obj, model);
  (0,_window_nreum__WEBPACK_IMPORTED_MODULE_1__/* .gosNREUMInitializedAgents */ .Qy)(id, _cache[id], 'loader_config');
}

/***/ }),

/***/ 5301:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Y": function() { return /* binding */ originals; }
/* harmony export */ });
/* harmony import */ var _window_nreum__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2378);

var originals = (0,_window_nreum__WEBPACK_IMPORTED_MODULE_0__/* .gosNREUMOriginals */ .mF)().o;

/***/ }),

/***/ 2469:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "O": function() { return /* binding */ getRuntime; },
  "s": function() { return /* binding */ setRuntime; }
});

// NAMESPACE OBJECT: ../../../../packages/browser-agent-core/common/util/user-agent.js
var user_agent_namespaceObject = {};
__webpack_require__.r(user_agent_namespaceObject);
__webpack_require__.d(user_agent_namespaceObject, {
  "agent": function() { return agentName; },
  "match": function() { return match; },
  "version": function() { return agentVersion; }
});

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/browser-version/ie-version.js
var ie_version = __webpack_require__(4269);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/timing/now.js
var now = __webpack_require__(9433);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/util/user-agent.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// Feature-detection is much preferred over using User Agent to detect browser.
// However, there are cases where feature detection is not possible, for example
// when a specific version of a browser has a bug that requires a workaround in just
// that version.
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#Browser_Name
var agentName = null;
var agentVersion = null;
var safari = /Version\/(\S+)\s+Safari/;

if (navigator.userAgent) {
  var userAgent = navigator.userAgent;
  var parts = userAgent.match(safari);

  if (parts && userAgent.indexOf('Chrome') === -1 && userAgent.indexOf('Chromium') === -1) {
    agentName = 'Safari';
    agentVersion = parts[1];
  }
} // export default {
//   agent: agentName,
//   version: agentVersion,
//   match: match
// }




function match(name, version) {
  if (!agentName) {
    return false;
  }

  if (name !== agentName) {
    return false;
  } // version not provided, only match by name


  if (!version) {
    return true;
  } // version provided, but not detected - not reliable match


  if (!agentVersion) {
    return false;
  }

  var detectedParts = agentVersion.split('.');
  var requestedParts = version.split('.');

  for (var i = 0; i < requestedParts.length; i++) {
    if (requestedParts[i] !== detectedParts[i]) {
      return false;
    }
  }

  return true;
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/configurable.js
var configurable = __webpack_require__(6271);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/window/nreum.js
var nreum = __webpack_require__(2378);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/config/state/runtime.js





var XHR = window.XMLHttpRequest;
var XHR_PROTO = XHR && XHR.prototype;
var model = {
  origin: '' + window.location,
  maxBytes: ie_version/* ieVersion */.H === 6 ? 2000 : 30000,
  offset: (0,now/* getLastTimestamp */.yf)(),
  features: {},
  customTransaction: undefined,
  onerror: undefined,
  releaseIds: undefined,
  xhrWrappable: XHR && XHR_PROTO && XHR_PROTO['addEventListener'] && !/CriOS/.test(navigator.userAgent),
  disabled: undefined,
  ptid: undefined,
  userAgent: user_agent_namespaceObject
};
var _cache = {};
function getRuntime(id) {
  if (!id) throw new Error('All config objects require an agent identifier!');
  if (!_cache[id]) throw new Error("Runtime for ".concat(id, " was never set"));
  return _cache[id];
}
function setRuntime(id, obj) {
  if (!id) throw new Error('All config objects require an agent identifier!');
  _cache[id] = new configurable/* Configurable */.I(obj, model);
  (0,nreum/* gosNREUMInitializedAgents */.Qy)(id, _cache[id], 'runtime');
}

/***/ }),

/***/ 5522:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "w": function() { return /* binding */ SharedContext; }
/* harmony export */ });
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var model = {
  agentIdentifier: ''
};
var SharedContext = /*#__PURE__*/_createClass(function SharedContext(context) {
  var _this = this;

  _classCallCheck(this, SharedContext);

  if (_typeof(context) !== 'object') return console.error('shared context requires an object as input');
  this.sharedContext = {};
  Object.assign(this.sharedContext, model);
  Object.entries(context).forEach(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        key = _ref2[0],
        value = _ref2[1];

    if (Object.keys(model).includes(key)) _this.sharedContext[key] = value;
  });
});

/***/ }),

/***/ 2666:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "C": function() { return /* binding */ globalInstance; },
/* harmony export */   "ee": function() { return /* binding */ baseEE; }
/* harmony export */ });
/* unused harmony export getOrSetContext */
/* harmony import */ var _window_nreum__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2378);
/* harmony import */ var _util_get_or_set__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1403);
/* harmony import */ var _util_map_own__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1599);
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */



var ctxId = 'nr@context'; // create global emitter instance that can be shared among bundles

var nr = (0,_window_nreum__WEBPACK_IMPORTED_MODULE_0__/* .gosNREUM */ .fP)();
var globalInstance;

if (nr.ee) {
  globalInstance = nr.ee;
} else {
  globalInstance = ee(undefined, 'globalEE');
  nr.ee = globalInstance;
} // export default ee()


var baseEE = ee(undefined, 'baseEE');



function EventContext() {}

function ee(old, debugId) {
  var handlers = {};
  var bufferGroupMap = {};
  var emitters = {};
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
    debugId: debugId
  }; // buffer is associated with a base emitter, since there are two
  // (global and scoped to the current bundle), it is now part of the emitter

  if (!old) {
    emitter.backlog = {};
  }

  return emitter;

  function context(contextOrStore) {
    if (contextOrStore && contextOrStore instanceof EventContext) {
      return contextOrStore;
    } else if (contextOrStore) {
      return (0,_util_get_or_set__WEBPACK_IMPORTED_MODULE_1__/* .getOrSet */ .X)(contextOrStore, ctxId, getNewContext);
    } else {
      return getNewContext();
    }
  }

  function emit(type, args, contextOrStore, force, bubble) {
    if (bubble !== false) bubble = true;

    if (baseEE.aborted && !force) {
      return;
    }

    if (old && bubble) old.emit(type, args, contextOrStore); // log("continue...")

    var ctx = context(contextOrStore);
    var handlersArray = listeners(type);
    var len = handlersArray.length; // Extremely verbose debug logging
    // if ([/^xhr/].map(function (match) {return type.match(match)}).filter(Boolean).length) {
    //  log(type + ' args:')
    //  log(args)
    //  log(type + ' handlers array:')
    //  log(handlersArray)
    //  log(type + ' context:')
    //  log(ctx)
    //  log(type + ' ctxStore:')
    //  log(ctxStore)
    // }
    // Apply each handler function in the order they were added
    // to the context with the arguments

    for (var i = 0; i < len; i++) {
      handlersArray[i].apply(ctx, args);
    } // log(bufferGroupMap[type])
    // Buffer after emitting for consistent ordering


    var bufferGroup = getBuffer()[bufferGroupMap[type]];

    if (bufferGroup) {
      bufferGroup.push([emitter, type, args, ctx]);
    } // log(bufferGroup)
    // Return the context so that the module that emitted can see what was done.


    return ctx;
  }

  function addEventListener(type, fn) {
    // Retrieve type from handlers, if it doesn't exist assign the default and retrieve it.
    handlers[type] = listeners(type).concat(fn);
  }

  function removeEventListener(type, fn) {
    var listeners = handlers[type];
    if (!listeners) return;

    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i] === fn) {
        listeners.splice(i, 1);
      }
    }
  }

  function listeners(type) {
    return handlers[type] || [];
  }

  function getOrCreate(name) {
    return emitters[name] = emitters[name] || ee(emitter, name);
  }

  function bufferEventsByGroup(types, group) {
    var eventBuffer = getBuffer(); // do not buffer events if agent has been aborted

    if (emitter.aborted) return;
    (0,_util_map_own__WEBPACK_IMPORTED_MODULE_2__/* .mapOwn */ .D)(types, function (i, type) {
      group = group || 'feature';
      bufferGroupMap[type] = group;

      if (!(group in eventBuffer)) {
        eventBuffer[group] = [];
      }
    });
  }

  function isBuffering(type) {
    var bufferGroup = getBuffer()[bufferGroupMap[type]];
    return !!bufferGroup;
  } // buffer is associated with a base emitter, since there are two
  // (global and scoped to the current bundle), it is now part of the emitter


  function getBuffer() {
    if (old) {
      return old.backlog;
    }

    return emitter.backlog;
  }
} // get context object from store object, or create if does not exist


function getOrSetContext(obj) {
  return getOrSet(obj, ctxId, getNewContext);
}

function getNewContext() {
  return new EventContext();
} // abort should be called 30 seconds after the page has started running
// We should drop our data and stop collecting if we still have a backlog, which
// signifies the rest of the agent wasn't loaded


function abortIfNotLoaded() {
  if (baseEE.backlog.api || baseEE.backlog.feature) {
    baseEE.aborted = true;
    baseEE.backlog = {};
  }
}

/***/ }),

/***/ 8668:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "EM": function() { return /* binding */ handleEE; },
/* harmony export */   "l_": function() { return /* binding */ globalEE; },
/* harmony export */   "pr": function() { return /* binding */ handle; }
/* harmony export */ });
/* unused harmony export global */
/* harmony import */ var _contextual_ee__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2666);
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var handleEE = _contextual_ee__WEBPACK_IMPORTED_MODULE_0__.ee.get('handle');
var globalEE = _contextual_ee__WEBPACK_IMPORTED_MODULE_0__/* .global.get */ .C.get('handle'); // Exported for register-handler to attach to.
// export default handle


function handle(type, args, ctx, group, ee) {
  if (ee) {
    ee.buffer([type], group);
    ee.emit(type, args, ctx);
  } else {
    handleEE.buffer([type], group);
    handleEE.emit(type, args, ctx);
  }
}

function globalHandle(type, args, ctx, group) {
  globalEE.buffer([type], group);
  globalEE.emit(type, args, ctx);
}

/***/ }),

/***/ 8244:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "XN": function() { return /* binding */ defaultRegister; },
/* harmony export */   "rP": function() { return /* binding */ defaultRegister; }
/* harmony export */ });
/* unused harmony export global */
/* harmony import */ var _handle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8668);
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
 // export default defaultRegister



defaultRegister.on = registerWithSpecificEmitter;
var handlers = defaultRegister.handlers = {};
var globalHandlers = globalRegister.handlers = {};
function defaultRegister(type, handler, group, ee) {
  registerWithSpecificEmitter(ee || _handle__WEBPACK_IMPORTED_MODULE_0__/* .handleEE */ .EM, handlers, type, handler, group);
}

function globalRegister(type, handler, group) {
  registerWithSpecificEmitter(_handle__WEBPACK_IMPORTED_MODULE_0__/* .globalEE */ .l_, globalHandlers, type, handler, group);
}

function registerWithSpecificEmitter(ee, handlers, type, handler, group) {
  if (!group) group = 'feature';
  if (!ee) ee = _handle__WEBPACK_IMPORTED_MODULE_0__/* .handleEE */ .EM;

  if (ee.isBuffering(type)) {
    var groupHandlers = handlers[group] = handlers[group] || {};
    var list = groupHandlers[type] = groupHandlers[type] || [];
    list.push([ee, handler]);
  } else {
    ee.on(type, handler);
  }
}

/***/ }),

/***/ 3207:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "m": function() { return /* binding */ eventListenerOpts; }
/* harmony export */ });
var supportsPassive = false;

try {
  var opts = Object.defineProperty({}, 'passive', {
    // eslint-disable-next-line
    get: function get() {
      supportsPassive = true;
    }
  });
  window.addEventListener('testPassive', null, opts);
  window.removeEventListener('testPassive', null, opts);
} catch (e) {// do nothing
}

function eventListenerOpts(useCapture) {
  return supportsPassive ? {
    passive: true,
    capture: !!useCapture
  } : !!useCapture;
} // export default eventListenerOpts

/***/ }),

/***/ 6898:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "o": function() { return /* binding */ HarvestScheduler; }
});

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/submit-data.js
var submit_data = __webpack_require__(533);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/context/shared-context.js
var shared_context = __webpack_require__(5522);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/harvest/harvest.js + 3 modules
var harvest = __webpack_require__(3125);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/unload/unload.js + 2 modules
var unload = __webpack_require__(1261);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/s-hash.js
var s_hash = __webpack_require__(4099);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/timing/start-time.js
var start_time = __webpack_require__(7704);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/init.js
var init = __webpack_require__(1311);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/cookie/nav-cookie.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


 // var sHash = require('./s-hash')
// var startTime = require('./start-time')
// functions are on object, so that they can be mocked
// var exp = {
//   conditionallySet: conditionallySet,
//   setCookie: setCookie
// }
// module.exports = exp

function conditionallySet(agentIdentifier) {
  // var areCookiesEnabled = true
  var areCookiesEnabled = (0,init/* getConfigurationValue */.Mt)(agentIdentifier, 'privacy.cookies_enabled'); // if ('init' in NREUM && 'privacy' in NREUM.init) {
  //   areCookiesEnabled = NREUM.init.privacy.cookies_enabled
  // }

  if (start_time/* navCookie */.s && areCookiesEnabled) {
    setCookie();
  }
}
function setCookie() {
  document.cookie = 'NREUM=s=' + Number(new Date()) + '&r=' + (0,s_hash/* sHash */.u)(document.location.href) + '&p=' + (0,s_hash/* sHash */.u)(document.referrer) + '; path=/';
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/harvest/harvest-scheduler.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// import { getSubmitMethod, send, sendX } from './harvest'





/**
 * Periodically invokes harvest calls and handles retries
 */

var HarvestScheduler = /*#__PURE__*/function (_SharedContext) {
  _inherits(HarvestScheduler, _SharedContext);

  var _super = _createSuper(HarvestScheduler);

  function HarvestScheduler(endpoint, opts, parent) {
    var _this;

    _classCallCheck(this, HarvestScheduler);

    _this = _super.call(this, parent); // gets any allowed properties from the parent and stores them in `sharedContext`

    _this.endpoint = endpoint;
    _this.opts = opts || {};
    _this.started = false;
    _this.timeoutHandle = null;
    _this.harvest = new harvest/* Harvest */.Mu(_this.sharedContext);
    (0,unload/* subscribeToUnload */.l)(function () {
      // if opts.onUnload is defined, these are special actions that are meant
      // to execute before attempting to send the final payload
      if (_this.opts.onUnload) _this.opts.onUnload();

      _this.harvest.sendFinal();

      conditionallySet(_this.sharedContext.agentIdentifier);
    });
    return _this;
  }

  _createClass(HarvestScheduler, [{
    key: "startTimer",
    value: function startTimer(interval, initialDelay) {
      this.interval = interval;
      this.started = true;
      this.scheduleHarvest(initialDelay != null ? initialDelay : this.interval);
    }
  }, {
    key: "stopTimer",
    value: function stopTimer() {
      this.started = false;

      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
      }
    }
  }, {
    key: "scheduleHarvest",
    value: function scheduleHarvest(delay, opts) {
      if (this.timeoutHandle) return;
      var timer = this;

      if (delay == null) {
        delay = this.interval;
      }

      this.timeoutHandle = setTimeout(function () {
        timer.timeoutHandle = null;
        timer.runHarvest(opts);
      }, delay * 1000);
    }
  }, {
    key: "runHarvest",
    value: function runHarvest(opts) {
      var scheduler = this;

      if (this.opts.getPayload) {
        var submitMethod = this.harvest.getSubmitMethod(this.endpoint, opts);
        if (!submitMethod) return false;
        var retry = submitMethod.method === submit_data/* submitData.xhr */.T.xhr;
        var payload = this.opts.getPayload({
          retry: retry
        });

        if (payload) {
          payload = Object.prototype.toString.call(payload) === '[object Array]' ? payload : [payload];

          for (var i = 0; i < payload.length; i++) {
            this.harvest.send(this.endpoint, payload[i], opts, submitMethod, onHarvestFinished, this.sharedContext.agentIdentifier);
          }
        }
      } else {
        this.harvest.sendX(this.endpoint, opts, onHarvestFinished, this.sharedContext.agentIdentifier);
      }

      if (this.started) {
        this.scheduleHarvest();
      }

      function onHarvestFinished(result) {
        scheduler.onHarvestFinished(opts, result);
      }
    }
  }, {
    key: "onHarvestFinished",
    value: function onHarvestFinished(opts, result) {
      if (this.opts.onFinished) {
        this.opts.onFinished(result);
      }

      if (result.sent && result.retry) {
        var delay = result.delay || this.opts.retryDelay; // reschedule next harvest if should be delayed longer

        if (this.started && delay) {
          clearTimeout(this.timeoutHandle);
          this.timeoutHandle = null;
          this.scheduleHarvest(delay, opts);
        } else if (!this.started && delay) {
          // if not running on a timer, schedule a single retry
          this.scheduleHarvest(delay, opts);
        }
      }
    }
  }]);

  return HarvestScheduler;
}(shared_context/* SharedContext */.w);

/***/ }),

/***/ 3125:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Mu": function() { return /* binding */ Harvest; },
  "y0": function() { return /* binding */ xhrUsable; }
});

// UNUSED EXPORTS: getSubmitMethod

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/map-own.js
var map_own = __webpack_require__(1599);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/url/encode.js
var encode = __webpack_require__(7187);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/stringify.js
var stringify = __webpack_require__(902);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/submit-data.js
var submit_data = __webpack_require__(533);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/reduce.js
var reduce = __webpack_require__(157);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/url/location.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// export default {
//   getLocation: getLocation
// }
function getLocation() {
  return '' + location;
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/init.js
var state_init = __webpack_require__(1311);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/info.js
var state_info = __webpack_require__(1525);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/runtime.js + 1 modules
var state_runtime = __webpack_require__(2469);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/url/clean-url.js
var clean_url = __webpack_require__(8413);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/timing/now.js
var now = __webpack_require__(9433);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-listener/event-listener-opts.js
var event_listener_opts = __webpack_require__(3207);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/browser-version/ie-version.js
var ie_version = __webpack_require__(4269);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/obfuscate.js + 2 modules
var obfuscate = __webpack_require__(808);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/util/traverse.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

// traverses an object and applies a fn to property values of a certain type
function applyFnToProps(obj, fn, type, ignoreKeys) {
  if (!obj || _typeof(obj) !== 'object') return obj;
  type = type || 'string';
  ignoreKeys = ignoreKeys || [];
  return traverse(obj);

  function traverse(obj) {
    for (var property in obj) {
      // eslint-disable-next-line
      if (obj.hasOwnProperty(property)) {
        if (_typeof(obj[property]) === 'object') {
          traverse(obj[property]);
        } else {
          if (_typeof(obj[property]) === type && !shouldIgnore(property)) obj[property] = fn(obj[property]);
        }
      }
    }

    return obj;
  }

  function shouldIgnore(key) {
    var ignore = false;

    for (var i = 0; i < ignoreKeys.length; i++) {
      if (ignoreKeys[i] === key) {
        ignore = true;
        break;
      }
    }

    return ignore;
  }
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/context/shared-context.js
var shared_context = __webpack_require__(5522);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/package.json
var package_namespaceObject = {"i8":"0.0.2"};
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/harvest/harvest.js
function harvest_typeof(obj) { "@babel/helpers - typeof"; return harvest_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, harvest_typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (harvest_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */















var version = package_namespaceObject.i8; // var version = '<VERSION>'
// var jsonp = 'NREUM.setToken'
// var _events = {}

var haveSendBeacon = !!navigator.sendBeacon; // requiring ie version updates the IE version on the loader object
// var ieVersion = require('./ie-version')

var xhrUsable = ie_version/* ieVersion */.H > 9 || ie_version/* ieVersion */.H === 0;
var Harvest = /*#__PURE__*/function (_SharedContext) {
  _inherits(Harvest, _SharedContext);

  var _super = _createSuper(Harvest);

  function Harvest(parent) {
    var _this;

    _classCallCheck(this, Harvest);

    _this = _super.call(this, parent); // gets any allowed properties from the parent and stores them in `sharedContext`

    _this.tooManyRequestsDelay = (0,state_init/* getConfigurationValue */.Mt)(_this.sharedContext.agentIdentifier, 'harvest.tooManyRequestsDelay') || 60;
    _this.obfuscator = new obfuscate/* Obfuscator */.R(_this.sharedContext);

    _this.getScheme = function () {
      return (0,state_init/* getConfigurationValue */.Mt)(_this.sharedContext.agentIdentifier, 'ssl') === false ? 'http' : 'https';
    };

    _this._events = {};
    return _this;
  }

  _createClass(Harvest, [{
    key: "sendFinal",
    value: function sendFinal() {
      var _this2 = this;

      var sents = (0,map_own/* mapOwn */.D)(this._events, function (endpoint) {
        return _this2.sendX(endpoint, {
          unload: true
        });
      });
      return (0,reduce/* reduce */.u)(sents, or);
    }
  }, {
    key: "sendX",
    value: function sendX(endpoint, opts, cbFinished) {
      var submitMethod = getSubmitMethod(endpoint, opts);
      if (!submitMethod) return false;
      var options = {
        retry: submitMethod.method === submit_data/* submitData.xhr */.T.xhr
      };
      return this.obfuscator.shouldObfuscate() ? this.obfuscator.obfuscateAndSend(endpoint, this.createPayload(endpoint, options), opts, submitMethod, cbFinished) : this._send(endpoint, this.createPayload(endpoint, options), opts, submitMethod, cbFinished);
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

  }, {
    key: "send",
    value: function send(endpoint, singlePayload, opts, submitMethod, cbFinished) {
      var makeBody = createAccumulator();
      var makeQueryString = createAccumulator();
      if (singlePayload.body) (0,map_own/* mapOwn */.D)(singlePayload.body, makeBody);
      if (singlePayload.qs) (0,map_own/* mapOwn */.D)(singlePayload.qs, makeQueryString);
      var payload = {
        body: makeBody(),
        qs: makeQueryString()
      };
      var caller = this.obfuscator.shouldObfuscate() ? this.obfuscator.obfuscateAndSend : this._send;
      return caller(endpoint, payload, opts, submitMethod, cbFinished);
    }
  }, {
    key: "obfuscateAndSend",
    value: function obfuscateAndSend(endpoint, payload, opts, submitMethod, cbFinished) {
      var _this3 = this;

      applyFnToProps(payload, function () {
        var _this3$obfuscator;

        return (_this3$obfuscator = _this3.obfuscator).obfuscateString.apply(_this3$obfuscator, arguments);
      }, 'string', ['e']);
      return this._send(endpoint, payload, opts, submitMethod, cbFinished);
    }
  }, {
    key: "_send",
    value: function _send(endpoint, payload, opts, submitMethod, cbFinished) {
      var info = (0,state_info/* getInfo */.C)(this.sharedContext.agentIdentifier);
      if (!info.errorBeacon) return false;

      if (!payload.body) {
        if (cbFinished) {
          cbFinished({
            sent: false
          });
        }

        return false;
      }

      if (!opts) opts = {};
      var url = this.getScheme() + '://' + info.errorBeacon + '/' + endpoint + '/1/' + info.licenseKey + this.baseQueryString();
      if (payload.qs) url += (0,encode/* obj */.j6)(payload.qs, (0,state_runtime/* getRuntime */.O)(this.sharedContext.agentIdentifier).maxBytes);

      if (!submitMethod) {
        submitMethod = getSubmitMethod(endpoint, opts);
      }

      var method = submitMethod.method;
      var useBody = submitMethod.useBody;
      var body;
      var fullUrl = url;

      if (useBody && endpoint === 'events') {
        body = payload.body.e;
      } else if (useBody) {
        body = (0,stringify/* stringify */.P)(payload.body);
      } else {
        fullUrl = url + (0,encode/* obj */.j6)(payload.body, (0,state_runtime/* getRuntime */.O)(this.sharedContext.agentIdentifier).maxBytes);
      }

      var result = method(fullUrl, body);

      if (cbFinished && method === submit_data/* submitData.xhr */.T.xhr) {
        var xhr = result;
        xhr.addEventListener('load', function () {
          var result = {
            sent: true
          };

          if (this.status === 429) {
            result.retry = true;
            result.delay = this.tooManyRequestsDelay;
          } else if (this.status === 408 || this.status === 500 || this.status === 503) {
            result.retry = true;
          }

          if (opts.needResponse) {
            result.responseText = this.responseText;
          }

          cbFinished(result);
        }, (0,event_listener_opts/* eventListenerOpts */.m)(false));
      } // if beacon request failed, retry with an alternative method


      if (!result && method === submit_data/* submitData.beacon */.T.beacon) {
        method = submit_data/* submitData.img */.T.img;
        result = method(url + (0,encode/* obj */.j6)(payload.body, (0,state_runtime/* getRuntime */.O)(this.sharedContext.agentIdentifier).maxBytes));
      }

      return result;
    } // The stuff that gets sent every time.

  }, {
    key: "baseQueryString",
    value: function baseQueryString() {
      var areCookiesEnabled = true;
      var init = (0,state_init/* getConfiguration */.P_)(this.sharedContext.agentIdentifier);
      var runtime = (0,state_runtime/* getRuntime */.O)(this.sharedContext.agentIdentifier);
      var info = (0,state_info/* getInfo */.C)(this.sharedContext.agentIdentifier);

      if ('privacy' in init) {
        areCookiesEnabled = init.privacy.cookies_enabled;
      }

      var location = (0,clean_url/* cleanURL */.f)(getLocation());
      var ref = this.obfuscator.shouldObfuscate() ? this.obfuscator.obfuscateString(location) : location;
      return ['?a=' + info.applicationID, (0,encode/* param */.wu)('sa', info.sa ? '' + info.sa : ''), (0,encode/* param */.wu)('v', version), transactionNameParam(info), (0,encode/* param */.wu)('ct', runtime.customTransaction), '&rst=' + (0,now/* now */.zO)(), '&ck=' + (areCookiesEnabled ? '1' : '0'), (0,encode/* param */.wu)('ref', ref), (0,encode/* param */.wu)('ptid', runtime.ptid ? '' + runtime.ptid : '')].join('');
    }
  }, {
    key: "createPayload",
    value: function createPayload(type, options) {
      var makeBody = createAccumulator();
      var makeQueryString = createAccumulator();
      var listeners = this._events[type] && this._events[type] || [];

      for (var i = 0; i < listeners.length; i++) {
        var singlePayload = listeners[i](options);
        if (!singlePayload) continue;
        if (singlePayload.body) (0,map_own/* mapOwn */.D)(singlePayload.body, makeBody);
        if (singlePayload.qs) (0,map_own/* mapOwn */.D)(singlePayload.qs, makeQueryString);
      }

      return {
        body: makeBody(),
        qs: makeQueryString()
      };
    }
  }, {
    key: "on",
    value: function on(type, listener) {
      var listeners = this._events[type] || (this._events[type] = []);
      listeners.push(listener);
    }
  }, {
    key: "resetListeners",
    value: function resetListeners() {
      (0,map_own/* mapOwn */.D)(this._events, function (key) {
        this._events[key] = [];
      });
    }
  }]);

  return Harvest;
}(shared_context/* SharedContext */.w);

function or(a, b) {
  return a || b;
} // function createPayload(type, options) {
//   var makeBody = createAccumulator()
//   var makeQueryString = createAccumulator()
//   var listeners = (_events[type] && _events[type] || [])
//   for (var i = 0; i < listeners.length; i++) {
//     var singlePayload = listeners[i](options)
//     if (!singlePayload) continue
//     if (singlePayload.body) mapOwn(singlePayload.body, makeBody)
//     if (singlePayload.qs) mapOwn(singlePayload.qs, makeQueryString)
//   }
//   return { body: makeBody(), qs: makeQueryString() }
// }


function getSubmitMethod(endpoint, opts) {
  opts = opts || {};
  var method;
  var useBody;

  if (opts.needResponse) {
    if (xhrUsable) {
      useBody = true;
      method = submit_data/* submitData.xhr */.T.xhr;
    } else {
      return false;
    }
  } else if (opts.unload) {
    useBody = haveSendBeacon;
    method = haveSendBeacon ? submit_data/* submitData.beacon */.T.beacon : submit_data/* submitData.img */.T.img;
  } else {
    // `submitData.beacon` was removed, there is an upper limit to the
    // number of data allowed before it starts failing, so we save it for
    // unload data
    if (xhrUsable) {
      useBody = true;
      method = submit_data/* submitData.xhr */.T.xhr;
    } else if (endpoint === 'events' || endpoint === 'jserrors') {
      method = submit_data/* submitData.img */.T.img;
    } else {
      return false;
    }
  }

  return {
    method: method,
    useBody: useBody
  };
} // Constructs the transaction name param for the beacon URL.
// Prefers the obfuscated transaction name over the plain text.
// Falls back to making up a name.

function transactionNameParam(info) {
  if (info.transactionName) return (0,encode/* param */.wu)('to', info.transactionName);
  return (0,encode/* param */.wu)('t', info.tNamePlain || 'Unnamed Transaction');
} // export function on(type, listener) {
//   var listeners = (_events[type] || (_events[type] = []))
//   listeners.push(listener)
// }
// export function resetListeners() {
//   mapOwn(_events, function (key) {
//     _events[key] = []
//   })
// }
// returns a function that can be called to accumulate values to a single object
// when the function is called without parameters, then the accumulator is returned


function createAccumulator() {
  var accumulator = {};
  var hasData = false;
  return function (key, val) {
    if (val && val.length) {
      accumulator[key] = val;
      hasData = true;
    }

    if (hasData) return accumulator;
  };
}

/***/ }),

/***/ 3077:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Ht": function() { return /* binding */ generateTraceId; },
/* harmony export */   "M": function() { return /* binding */ generateSpanId; },
/* harmony export */   "ky": function() { return /* binding */ generateRandomHexString; }
/* harmony export */ });
/* unused harmony export generateUuid */
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// export default {
//   generateUuid: generateUuid,
//   generateSpanId: generateSpanId,
//   generateTraceId: generateTraceId
// }
function generateUuid() {
  var randomVals = null;
  var rvIndex = 0;
  var crypto = window.crypto || window.msCrypto;

  if (crypto && crypto.getRandomValues) {
    randomVals = crypto.getRandomValues(new Uint8Array(31));
  }

  function getRandomValue() {
    if (randomVals) {
      // same as % 16
      return randomVals[rvIndex++] & 15;
    } else {
      return Math.random() * 16 | 0;
    }
  } // v4 UUID


  var template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  var id = '';
  var c;

  for (var i = 0; i < template.length; i++) {
    c = template[i];

    if (c === 'x') {
      id += getRandomValue().toString(16);
    } else if (c === 'y') {
      // this is the uuid variant per spec (8, 9, a, b)
      // % 4, then shift to get values 8-11
      c = getRandomValue() & 0x3 | 0x8;
      id += c.toString(16);
    } else {
      id += c;
    }
  }

  return id;
} // 16-character hex string (per DT spec)

function generateSpanId() {
  return generateRandomHexString(16);
} // 32-character hex string (per DT spec)

function generateTraceId() {
  return generateRandomHexString(32);
}
function generateRandomHexString(length) {
  var randomVals = null;
  var rvIndex = 0;
  var crypto = window.crypto || window.msCrypto;

  if (crypto && crypto.getRandomValues && Uint8Array) {
    randomVals = crypto.getRandomValues(new Uint8Array(31));
  }

  var chars = [];

  for (var i = 0; i < length; i++) {
    chars.push(getRandomValue().toString(16));
  }

  return chars.join('');

  function getRandomValue() {
    if (randomVals) {
      // same as % 16
      return randomVals[rvIndex++] & 15;
    } else {
      return Math.random() * 16 | 0;
    }
  }
}

/***/ }),

/***/ 8915:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "VB": function() { return /* binding */ recordSupportability; }
/* harmony export */ });
/* unused harmony exports recordCustom, constants */
/* harmony import */ var _event_emitter_handle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8668);

var SUPPORTABILITY_METRIC = 'sm';
var CUSTOM_METRIC = 'cm';
/**
 * Records a supportabilityMetric (sm) using the value of a named property or as a counter without a value.
 * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
 * @param {number} [value] - The value of the metric, if none, will increment counter
 * @returns void
 */

function recordSupportability(name, value) {
  var opts = [SUPPORTABILITY_METRIC, name, {
    name: name
  }, value];
  (0,_event_emitter_handle__WEBPACK_IMPORTED_MODULE_0__/* .handle */ .pr)('storeMetric', opts, null, 'api');
  return opts;
}
/**
 * Records a customMetric (cm) using the value of a named property or as a counter without a value.
 * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
 * @param {Object.<string, number>} [value] - The named property upon which to aggregate values. This will generate the substring of the metric name. If none, will incrememnt counter
 * @returns void
 */

function recordCustom(name, metrics) {
  var opts = [CUSTOM_METRIC, name, {
    name: name
  }, metrics];
  handle('storeEventMetrics', opts, null, 'api');
  return opts;
}
var constants = {
  SUPPORTABILITY_METRIC: SUPPORTABILITY_METRIC,
  CUSTOM_METRIC: CUSTOM_METRIC
}; // export default {
//   constants,
//   recordSupportability: recordSupportability,
//   recordCustom: recordCustom
// }

/***/ }),

/***/ 6389:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AG": function() { return /* binding */ nullable; },
/* harmony export */   "FX": function() { return /* binding */ getAddStringContext; },
/* harmony export */   "n1": function() { return /* binding */ addCustomAttributes; },
/* harmony export */   "uR": function() { return /* binding */ numeric; }
/* harmony export */ });
/* harmony import */ var _util_map_own__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1599);
/* harmony import */ var _util_stringify__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(902);
/* harmony import */ var _util_obfuscate__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(808);
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */



var hasOwnProp = Object.prototype.hasOwnProperty;
var MAX_ATTRIBUTES = 64; // export default {
//   nullable,
//   numeric,
//   getAddStringContext,
//   addCustomAttributes
// }

function nullable(val, fn, comma) {
  return val || val === 0 || val === '' ? fn(val) + (comma ? ',' : '') : '!';
}
function numeric(n, noDefault) {
  if (noDefault) {
    return Math.floor(n).toString(36);
  }

  return n === undefined || n === 0 ? '' : Math.floor(n).toString(36);
}
function getAddStringContext(agentIdentifier) {
  // eslint-disable-next-line
  var stringTable = Object.hasOwnProperty('create') ? Object.create(null) : {};
  var stringTableIdx = 0;
  return addString;

  function addString(str) {
    if (typeof str === 'undefined' || str === '') return '';
    var obfuscator = new _util_obfuscate__WEBPACK_IMPORTED_MODULE_0__/* .Obfuscator */ .R({
      agentIdentifier: agentIdentifier
    });
    str = String(str);
    if (obfuscator.shouldObfuscate()) str = obfuscator.obfuscateString(str);

    if (hasOwnProp.call(stringTable, str)) {
      return numeric(stringTable[str], true);
    } else {
      stringTable[str] = stringTableIdx++;
      return quoteString(str);
    }
  }
}
function addCustomAttributes(attrs, addString) {
  var attrParts = [];
  (0,_util_map_own__WEBPACK_IMPORTED_MODULE_1__/* .mapOwn */ .D)(attrs, function (key, val) {
    if (attrParts.length >= MAX_ATTRIBUTES) return;
    var type = 5;
    var serializedValue; // add key to string table first

    key = addString(key);

    switch (_typeof(val)) {
      case 'object':
        if (val) {
          // serialize objects to strings
          serializedValue = addString((0,_util_stringify__WEBPACK_IMPORTED_MODULE_2__/* .stringify */ .P)(val));
        } else {
          // null attribute type
          type = 9;
        }

        break;

      case 'number':
        type = 6; // make sure numbers contain a `.` so they are parsed as doubles

        serializedValue = val % 1 ? val : val + '.';
        break;

      case 'boolean':
        type = val ? 7 : 8;
        break;

      case 'undefined':
        // we treat undefined as a null attribute (since dirac does not have a concept of undefined)
        type = 9;
        break;

      default:
        serializedValue = addString(val);
    }

    attrParts.push([type, key + (serializedValue ? ',' + serializedValue : '')]);
  });
  return attrParts;
}
var escapable = /([,\\;])/g;

function quoteString(str) {
  return "'" + str.replace(escapable, '\\$1');
}

/***/ }),

/***/ 9433:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "nb": function() { return /* binding */ setOffset; },
/* harmony export */   "os": function() { return /* binding */ getOffset; },
/* harmony export */   "yf": function() { return /* binding */ getLastTimestamp; },
/* harmony export */   "zO": function() { return /* binding */ now; }
/* harmony export */ });
/* harmony import */ var _performance_check__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6249);
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var lastTimestamp = new Date().getTime();
var offset = lastTimestamp; // export default now

function now() {
  if (_performance_check__WEBPACK_IMPORTED_MODULE_0__/* .exists */ .G && performance.now) {
    return Math.round(performance.now());
  } // ensure a new timestamp is never smaller than a previous timestamp


  return (lastTimestamp = Math.max(new Date().getTime(), lastTimestamp)) - offset;
}
function getLastTimestamp() {
  return lastTimestamp;
}
function setOffset(val) {
  offset = val;
}
function getOffset() {
  return offset;
}

/***/ }),

/***/ 6249:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "G": function() { return /* binding */ exists; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var exists = typeof window.performance !== 'undefined' && window.performance.timing && typeof window.performance.timing.navigationStart !== 'undefined'; // export default {
//   exists
// }

/***/ }),

/***/ 7704:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "s": function() { return /* binding */ navCookie; },
/* harmony export */   "v": function() { return /* binding */ findStartTime; }
/* harmony export */ });
/* harmony import */ var _util_s_hash__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(4099);
/* harmony import */ var _stopwatch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9387);
/* harmony import */ var _browser_version_firefox_version__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6062);
/* harmony import */ var _now__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9433);
/* harmony import */ var _performance_check__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6249);
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// Use various techniques to determine the time at which this page started and whether to capture navigation timing information





var navCookie = true;
findStartTime();
function findStartTime() {
  var starttime = findStartWebTiming() || findStartCookie();
  if (!starttime) return;
  (0,_stopwatch__WEBPACK_IMPORTED_MODULE_0__/* .mark */ .B)('starttime', starttime); // Refine loader.offset
  // offset = starttime

  (0,_now__WEBPACK_IMPORTED_MODULE_1__/* .setOffset */ .nb)(starttime);
} // Find the start time from the Web Timing 'performance' object.
// http://test.w3.org/webperf/specs/NavigationTiming/
// http://blog.chromium.org/2010/07/do-you-know-how-slow-your-web-page-is.html

function findStartWebTiming() {
  // FF 7/8 has a bug with the navigation start time, so use cookie instead of native interface
  if (_browser_version_firefox_version__WEBPACK_IMPORTED_MODULE_2__/* .ffVersion */ .I && _browser_version_firefox_version__WEBPACK_IMPORTED_MODULE_2__/* .ffVersion */ .I < 9) return;

  if (_performance_check__WEBPACK_IMPORTED_MODULE_3__/* .exists */ .G) {
    // note that we don't need to use a cookie to record navigation start time
    navCookie = false;
    return window.performance.timing.navigationStart;
  }
} // Find the start time based on a cookie set by Episodes in the unload handler.


function findStartCookie() {
  var aCookies = document.cookie.split(' ');

  for (var i = 0; i < aCookies.length; i++) {
    if (aCookies[i].indexOf('NREUM=') === 0) {
      var startPage;
      var referrerPage;
      var aSubCookies = aCookies[i].substring('NREUM='.length).split('&');
      var startTime;
      var bReferrerMatch;

      for (var j = 0; j < aSubCookies.length; j++) {
        if (aSubCookies[j].indexOf('s=') === 0) {
          startTime = aSubCookies[j].substring(2);
        } else if (aSubCookies[j].indexOf('p=') === 0) {
          referrerPage = aSubCookies[j].substring(2); // if the sub-cookie is not the last cookie it will have a trailing ';'

          if (referrerPage.charAt(referrerPage.length - 1) === ';') {
            referrerPage = referrerPage.substr(0, referrerPage.length - 1);
          }
        } else if (aSubCookies[j].indexOf('r=') === 0) {
          startPage = aSubCookies[j].substring(2); // if the sub-cookie is not the last cookie it will have a trailing ';'

          if (startPage.charAt(startPage.length - 1) === ';') {
            startPage = startPage.substr(0, startPage.length - 1);
          }
        }
      }

      if (startPage) {
        var docReferrer = (0,_util_s_hash__WEBPACK_IMPORTED_MODULE_4__/* .sHash */ .u)(document.referrer);
        bReferrerMatch = docReferrer == startPage; // eslint-disable-line

        if (!bReferrerMatch) {
          // Navigation did not start at the page that was just exited, check for re-load
          // (i.e. the page just exited is the current page and the referring pages match)
          bReferrerMatch = (0,_util_s_hash__WEBPACK_IMPORTED_MODULE_4__/* .sHash */ .u)(document.location.href) == startPage && docReferrer == referrerPage; // eslint-disable-line
        }
      }

      if (bReferrerMatch && startTime) {
        var now = new Date().getTime();

        if (now - startTime > 60000) {
          return;
        }

        return startTime;
      }
    }
  }
}

/***/ }),

/***/ 9387:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "B": function() { return /* binding */ mark; },
/* harmony export */   "L": function() { return /* binding */ measure; }
/* harmony export */ });
/* harmony import */ var _now__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9433);
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var marks = {}; // module.exports = {
//   mark: mark,
//   measure: measure
// }

function mark(markName, markTime) {
  if (typeof markTime === 'undefined') markTime = (0,_now__WEBPACK_IMPORTED_MODULE_0__/* .now */ .zO)() + (0,_now__WEBPACK_IMPORTED_MODULE_0__/* .getOffset */ .os)();
  marks[markName] = markTime;
}
function measure(aggregator, metricName, startMark, endMark) {
  var start = marks[startMark];
  var end = marks[endMark];
  if (typeof start === 'undefined' || typeof end === 'undefined') return;
  aggregator.store('measures', metricName, {
    value: end - start
  });
}

/***/ }),

/***/ 1261:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "l": function() { return /* binding */ subscribeToUnload; }
});

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/browser-version/firefox-version.js
var firefox_version = __webpack_require__(6062);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/node_modules/lodash._slice/index.js
var lodash_slice = __webpack_require__(1990);
var lodash_slice_default = /*#__PURE__*/__webpack_require__.n(lodash_slice);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/util/single.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
 // export default single

function single(fn) {
  var called = false;
  var res;
  return function () {
    if (called) return res;
    called = true;
    res = fn.apply(this, lodash_slice_default()(arguments));
    return res;
  };
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-listener/event-listener-opts.js
var event_listener_opts = __webpack_require__(3207);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/event-listener/add-e.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
 // Safely add an event listener to window in any browser

function addE(sType, callback) {
  if ('addEventListener' in window) {
    return window.addEventListener(sType, callback, (0,event_listener_opts/* eventListenerOpts */.m)(false));
  } else if ('attachEvent' in window) {
    return window.attachEvent('on' + sType, callback);
  }
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/unload/unload.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


 // export default subscribeToUnload
// Used to subscribe a callback to when a page is being unloaded. This is used,
// for example, to submit a final harvest.

function subscribeToUnload(cb) {
  var oneCall = single(cb); // Firefox has a bug wherein a slow-loading resource loaded from the 'pagehide'
  // or 'unload' event will delay the 'load' event firing on the next page load.
  // In Firefox versions that support sendBeacon, this doesn't matter, because
  // we'll use it instead of an image load for our final harvest.
  //
  // Some Safari versions never fire the 'unload' event for pages that are being
  // put into the WebKit page cache, so we *need* to use the pagehide event for
  // the final submission from Safari.
  //
  // Generally speaking, we will try to submit our final harvest from either
  // pagehide or unload, whichever comes first, but in Firefox, we need to avoid
  // attempting to submit from pagehide to ensure that we don't slow down loading
  // of the next page.

  if (!firefox_version/* ffVersion */.I || navigator.sendBeacon) {
    addE('pagehide', oneCall);
  } else {
    addE('beforeunload', oneCall);
  }

  addE('unload', oneCall);
}

/***/ }),

/***/ 8413:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "f": function() { return /* binding */ cleanURL; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var withHash = /([^?#]*)[^#]*(#[^?]*|$).*/;
var withoutHash = /([^?#]*)().*/;
function cleanURL(url, keepHash) {
  return url.replace(keepHash ? withHash : withoutHash, '$1$2');
} // export default cleanURL

/***/ }),

/***/ 7187:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "j6": function() { return /* binding */ obj; },
/* harmony export */   "nI": function() { return /* binding */ fromArray; },
/* harmony export */   "wu": function() { return /* binding */ param; }
/* harmony export */ });
/* unused harmony export qs */
/* harmony import */ var _util_map_own__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1599);
/* harmony import */ var _util_stringify__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(902);
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
};
var charList = (0,_util_map_own__WEBPACK_IMPORTED_MODULE_0__/* .mapOwn */ .D)(charMap, function (k) {
  return k;
});
var safeEncoded = new RegExp(charList.join('|'), 'g');

function real(c) {
  return charMap[c];
} // Encode as URI Component, then unescape anything that is ok in the
// query string position.


function qs(value) {
  if (value === null || value === undefined) return 'null';
  return encodeURIComponent(value).replace(safeEncoded, real);
} // export default {obj: obj, fromArray: fromArray, qs: qs, param: param}

function fromArray(qs, maxBytes) {
  var bytes = 0;

  for (var i = 0; i < qs.length; i++) {
    bytes += qs[i].length;
    if (bytes > maxBytes) return qs.slice(0, i).join('');
  }

  return qs.join('');
}
function obj(payload, maxBytes) {
  var total = 0;
  var result = '';
  (0,_util_map_own__WEBPACK_IMPORTED_MODULE_0__/* .mapOwn */ .D)(payload, function (feature, dataArray) {
    var intermediate = [];
    var next;
    var i;

    if (typeof dataArray === 'string') {
      next = '&' + feature + '=' + qs(dataArray);
      total += next.length;
      result += next;
    } else if (dataArray.length) {
      total += 9;

      for (i = 0; i < dataArray.length; i++) {
        next = qs((0,_util_stringify__WEBPACK_IMPORTED_MODULE_1__/* .stringify */ .P)(dataArray[i]));
        total += next.length;
        if (typeof maxBytes !== 'undefined' && total >= maxBytes) break;
        intermediate.push(next);
      }

      result += '&' + feature + '=%5B' + intermediate.join(',') + '%5D';
    }
  });
  return result;
} // Constructs an HTTP parameter to add to the BAM router URL

function param(name, value) {
  if (value && typeof value === 'string') {
    return '&' + name + '=' + qs(value);
  }

  return '';
}

/***/ }),

/***/ 5060:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "e": function() { return /* binding */ parseUrl; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var stringsToParsedUrls = {};
function parseUrl(url) {
  if (url in stringsToParsedUrls) {
    return stringsToParsedUrls[url];
  }

  var urlEl = document.createElement('a');
  var location = window.location;
  var ret = {}; // Use an anchor dom element to resolve the url natively.

  urlEl.href = url;
  ret.port = urlEl.port;
  var firstSplit = urlEl.href.split('://');

  if (!ret.port && firstSplit[1]) {
    ret.port = firstSplit[1].split('/')[0].split('@').pop().split(':')[1];
  }

  if (!ret.port || ret.port === '0') ret.port = firstSplit[0] === 'https' ? '443' : '80'; // Host not provided in IE for relative urls

  ret.hostname = urlEl.hostname || location.hostname;
  ret.pathname = urlEl.pathname;
  ret.protocol = firstSplit[0]; // Pathname sometimes doesn't have leading slash (IE 8 and 9)

  if (ret.pathname.charAt(0) !== '/') ret.pathname = '/' + ret.pathname; // urlEl.protocol is ':' in old ie when protocol is not specified

  var sameProtocol = !urlEl.protocol || urlEl.protocol === ':' || urlEl.protocol === location.protocol;
  var sameDomain = urlEl.hostname === document.domain && urlEl.port === location.port; // urlEl.hostname is not provided by IE for relative urls, but relative urls are also same-origin

  ret.sameOrigin = sameProtocol && (!urlEl.hostname || sameDomain); // Only cache if url doesn't have a path

  if (ret.pathname === '/') {
    stringsToParsedUrls[url] = ret;
  }

  return ret;
}

/***/ }),

/***/ 9077:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "W": function() { return /* binding */ FeatureBase; }
/* harmony export */ });
/* harmony import */ var _event_emitter_contextual_ee__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2666);
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }


var FeatureBase = /*#__PURE__*/_createClass(function FeatureBase(agentIdentifier, aggregator) {
  _classCallCheck(this, FeatureBase);

  this.agentIdentifier = agentIdentifier;
  this.aggregator = aggregator;
  this.ee = _event_emitter_contextual_ee__WEBPACK_IMPORTED_MODULE_0__.ee.get(agentIdentifier);
});

/***/ }),

/***/ 1403:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "X": function() { return /* binding */ getOrSet; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var has = Object.prototype.hasOwnProperty; // export default getOrSet
// Always returns the current value of obj[prop], even if it has to set it first

function getOrSet(obj, prop, getVal) {
  // If the value exists return it.
  if (has.call(obj, prop)) return obj[prop];
  var val = getVal(); // Attempt to set the property so it's not enumerable

  if (Object.defineProperty && Object.keys) {
    try {
      Object.defineProperty(obj, prop, {
        value: val,
        // old IE inherits non-write-ability
        writable: true,
        enumerable: false
      });
      return val;
    } catch (e) {// Can't report internal errors,
      // because GOS is a dependency of the reporting mechanisms
    }
  } // fall back to setting normally


  obj[prop] = val;
  return val;
}

/***/ }),

/***/ 1599:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "D": function() { return /* binding */ mapOwn; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var has = Object.prototype.hasOwnProperty; // export default mapOwn

function mapOwn(obj, fn) {
  var results = [];
  var key = '';
  var i = 0;

  for (key in obj) {
    if (has.call(obj, key)) {
      results[i] = fn(key, obj[key]);
      i += 1;
    }
  }

  return results;
}

/***/ }),

/***/ 808:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "R": function() { return /* binding */ Obfuscator; }
});

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/init.js
var init = __webpack_require__(1311);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/context/shared-context.js
var shared_context = __webpack_require__(5522);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/metrics/metrics.js
var metrics = __webpack_require__(8915);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/window/win.js
var origWindow = window;
var win = origWindow;
function getWindow() {
  return win;
}
function setWindow(x) {
  win = x;
}
function resetWindow() {
  win = origWindow;
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/url/protocol.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


var protocol = {
  isFileProtocol: isFileProtocol,
  supportabilityMetricSent: false
};

if (isFileProtocol()) {
  (0,metrics/* recordSupportability */.VB)('Generic/FileProtocol/Detected');
  protocol.supportabilityMetricSent = true;
}

function isFileProtocol() {
  var win = getWindow();
  return !!(win.location && win.location.protocol && win.location.protocol === 'file:');
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/util/obfuscate.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }





var fileProtocolRule = {
  regex: /^file:\/\/(.*)/,
  replacement: 'file://OBFUSCATED'
};
var recordedSupportability = false;
var Obfuscator = /*#__PURE__*/function (_SharedContext) {
  _inherits(Obfuscator, _SharedContext);

  var _super = _createSuper(Obfuscator);

  function Obfuscator(parent) {
    var _this;

    _classCallCheck(this, Obfuscator);

    _this = _super.call(this, parent); // gets any allowed properties from the parent and stores them in `sharedContext`

    if (!recordedSupportability) {
      if (_this.shouldObfuscate()) (0,metrics/* recordSupportability */.VB)('Generic/Obfuscate/Detected');
      if (_this.shouldObfuscate() && !_this.validateRules(_this.getRules())) (0,metrics/* recordSupportability */.VB)('Generic/Obfuscate/Invalid');
      recordedSupportability = true;
    }

    return _this;
  }

  _createClass(Obfuscator, [{
    key: "shouldObfuscate",
    value: function shouldObfuscate() {
      return this.getRules().length > 0;
    }
  }, {
    key: "getRules",
    value: function getRules() {
      var rules = [];
      var configRules = (0,init/* getConfigurationValue */.Mt)(this.sharedContext.agentIdentifier, 'obfuscate') || [];
      rules = rules.concat(configRules);
      if (protocol.isFileProtocol()) rules.push(fileProtocolRule); // could add additional runtime/environment-specific rules here

      return rules;
    } // takes array of rule objects, logs warning and returns false if any portion of rule is invalid

  }, {
    key: "validateRules",
    value: function validateRules(rules) {
      var invalidReplacementDetected = false;
      var invalidRegexDetected = false;

      for (var i = 0; i < rules.length; i++) {
        if (!('regex' in rules[i])) {
          if (console && console.warn) console.warn('An obfuscation replacement rule was detected missing a "regex" value.');
          invalidRegexDetected = true;
        } else if (typeof rules[i].regex !== 'string' && !(rules[i].regex.constructor === RegExp)) {
          if (console && console.warn) console.warn('An obfuscation replacement rule contains a "regex" value with an invalid type (must be a string or RegExp)');
          invalidRegexDetected = true;
        }

        var replacement = rules[i].replacement;

        if (replacement) {
          if (typeof replacement !== 'string') {
            if (console && console.warn) console.warn('An obfuscation replacement rule contains a "replacement" value with an invalid type (must be a string)');
            invalidReplacementDetected = true;
          }
        }
      }

      return !invalidReplacementDetected && !invalidRegexDetected;
    } // applies all regex obfuscation rules to provided URL string and returns the result

  }, {
    key: "obfuscateString",
    value: function obfuscateString(string, agentIdentifier) {
      // if string is empty string, null or not a string, return unmodified
      if (!string || typeof string !== 'string') return string;
      var rules = this.getRules(agentIdentifier);
      var obfuscated = string; // apply every rule to URL string

      for (var i = 0; i < rules.length; i++) {
        var regex = rules[i].regex;
        var replacement = rules[i].replacement || '*';
        obfuscated = obfuscated.replace(regex, replacement);
      }

      return obfuscated;
    }
  }]);

  return Obfuscator;
}(shared_context/* SharedContext */.w);

/***/ }),

/***/ 157:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "u": function() { return /* binding */ reduce; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
function reduce(arr, fn, next) {
  var i = 0;

  if (typeof next === 'undefined') {
    next = arr[0];
    i = 1;
  }

  for (i; i < arr.length; i++) {
    next = fn(next, arr[i]);
  }

  return next;
}

/***/ }),

/***/ 4099:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "u": function() { return /* binding */ sHash; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
function sHash(s) {
  var i;
  var h = 0;

  for (i = 0; i < s.length; i++) {
    h += (i + 1) * s.charCodeAt(i);
  }

  return Math.abs(h);
}

/***/ }),

/***/ 902:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "P": function() { return /* binding */ stringify; }
/* harmony export */ });
/* harmony import */ var _map_own__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1599);
/* harmony import */ var _event_emitter_contextual_ee__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2666);
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g; // eslint-disable-line

var meta = {
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  '"': '\\"',
  '\\': '\\\\'
}; // export default stringify

function stringify(val) {
  try {
    return str('', {
      '': val
    });
  } catch (e) {
    try {
      _event_emitter_contextual_ee__WEBPACK_IMPORTED_MODULE_0__.ee.emit('internal-error', [e]);
    } catch (err) {// do nothing
    }
  }
}

function quote(string) {
  escapable.lastIndex = 0;
  return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
    var c = meta[a];
    return typeof c === 'string' ? c : "\\u" + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
  }) + '"' : '"' + string + '"';
}

function str(key, holder) {
  var value = holder[key];

  switch (_typeof(value)) {
    case 'string':
      return quote(value);

    case 'number':
      return isFinite(value) ? String(value) : 'null';

    case 'boolean':
      return String(value);

    case 'object':
      if (!value) {
        return 'null';
      }

      var partial = []; // The value is an array. Stringify every element. Use null as a placeholder
      // for non-JSON values.

      if (value instanceof window.Array || Object.prototype.toString.apply(value) === '[object Array]') {
        var length = value.length;

        for (var i = 0; i < length; i += 1) {
          partial[i] = str(i, value) || 'null';
        }

        return partial.length === 0 ? '[]' : '[' + partial.join(',') + ']';
      }

      (0,_map_own__WEBPACK_IMPORTED_MODULE_1__/* .mapOwn */ .D)(value, function (k) {
        var v = str(k, value);
        if (v) partial.push(quote(k) + ':' + v);
      });
      return partial.length === 0 ? '{}' : '{' + partial.join(',') + '}';
  }
}

/***/ }),

/***/ 533:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "T": function() { return /* binding */ submitData; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var submitData = {}; // export default submitData

submitData.jsonp = function jsonp(url, jsonp) {
  var element = document.createElement('script');
  element.type = 'text/javascript';
  element.src = url + '&jsonp=' + jsonp;
  var firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(element, firstScript);
  return element;
};

submitData.xhr = function xhr(url, body, sync) {
  var request = new XMLHttpRequest();
  request.open('POST', url, !sync);

  try {
    // Set cookie
    if ('withCredentials' in request) request.withCredentials = true;
  } catch (e) {// do nothing
  }

  request.setRequestHeader('content-type', 'text/plain');
  request.send(body);
  return request;
};

submitData.xhrSync = function xhrSync(url, body) {
  return submitData.xhr(url, body, true);
};

submitData.img = function img(url) {
  var element = new Image();
  element.src = url;
  return element;
};

submitData.beacon = function (url, body) {
  return navigator.sendBeacon(url, body);
};

/***/ }),

/***/ 2378:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Qy": function() { return /* binding */ gosNREUMInitializedAgents; },
/* harmony export */   "ce": function() { return /* binding */ defaults; },
/* harmony export */   "fP": function() { return /* binding */ gosNREUM; },
/* harmony export */   "mF": function() { return /* binding */ gosNREUMOriginals; }
/* harmony export */ });
/* unused harmony exports gosNREUMInfo, gosNREUMLoaderConfig, gosNREUMInit, addToNREUM, NREUMinitialized, gosCDN */
/* harmony import */ var _timing_now__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9433);
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }


var defaults = {
  beacon: 'bam.nr-data.net',
  errorBeacon: 'bam.nr-data.net'
};
function gosNREUM() {
  if (!window.NREUM) {
    window.NREUM = {};
  }

  if (typeof window.newrelic === 'undefined') window.newrelic = window.NREUM;
  return window.NREUM;
}
function gosNREUMInfo() {
  var nr = gosNREUM();
  var externallySupplied = nr.info || {};
  nr.info = _objectSpread({
    beacon: defaults.beacon,
    errorBeacon: defaults.errorBeacon
  }, externallySupplied);
  return nr;
}
function gosNREUMLoaderConfig() {
  var nr = gosNREUM();
  var externallySupplied = nr.loader_config || {};
  nr.loader_config = _objectSpread({}, externallySupplied);
  return nr;
}
function gosNREUMInit() {
  var nr = gosNREUM();
  var externallySupplied = nr.init || {};
  nr.init = _objectSpread({}, externallySupplied);
  return nr;
}
function gosNREUMOriginals() {
  var nr = gosNREUM();

  if (!nr.o) {
    var win = window; // var doc = win.document

    var XHR = win.XMLHttpRequest;
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
    };
  }

  return nr;
}
function gosNREUMInitializedAgents(id, obj, target) {
  var nr = gosNREUM();
  var externallySupplied = nr.initializedAgents || {};
  var curr = externallySupplied[id] || {};

  if (!Object.keys(curr).length) {
    curr.initializedAt = {
      ms: (0,_timing_now__WEBPACK_IMPORTED_MODULE_0__/* .now */ .zO)(),
      date: new Date()
    };
  }

  nr.initializedAgents = _objectSpread(_objectSpread({}, externallySupplied), {}, _defineProperty({}, id, _objectSpread(_objectSpread({}, curr), {}, _defineProperty({}, target, obj))));
  return nr;
}
function addToNREUM(fnName, fn) {
  var nr = gosNREUM();
  nr[fnName] = fn;
}
function NREUMinitialized() {
  var nr = gosNREUM();
  nr.initialized = true;
}
function gosCDN() {
  gosNREUMInfo();
  gosNREUMInit();
  gosNREUMOriginals();
  gosNREUMLoaderConfig();
  return gosNREUM();
}

/***/ }),

/***/ 807:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "W": function() { return /* binding */ supportsPerformanceObserver; }
/* harmony export */ });
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
function supportsPerformanceObserver() {
  return 'PerformanceObserver' in window && typeof window.PerformanceObserver === 'function';
}

/***/ }),

/***/ 7423:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "em": function() { return /* binding */ wrap_wrapEvents; },
  "u5": function() { return /* binding */ wrap_wrapFetch; },
  "QU": function() { return /* binding */ wrap_wrapHistory; },
  "gy": function() { return /* binding */ wrap_wrapRaf; },
  "BV": function() { return /* binding */ wrap_wrapTimer; },
  "Kf": function() { return /* binding */ wrap_wrapXhr; }
});

// UNUSED EXPORTS: wrapGlobalFetch, wrapJson, wrapMutation, wrapPromise

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-emitter/contextual-ee.js
var contextual_ee = __webpack_require__(2666);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/node_modules/lodash._slice/index.js
var lodash_slice = __webpack_require__(1990);
var lodash_slice_default = /*#__PURE__*/__webpack_require__.n(lodash_slice);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/originals.js
var originals = __webpack_require__(5301);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/wrap/wrap-fetch.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */




var win = window;
var prefix = 'fetch-';
var bodyPrefix = prefix + 'body-';
var bodyMethods = (/* unused pure expression or super */ null && (['arrayBuffer', 'blob', 'json', 'text', 'formData']));
var Req = win.Request;
var Res = win.Response; // var fetch = win.fetch

var proto = 'prototype';
var ctxId = 'nr@context';
function wrapGlobal() {
  // since these are prototype methods, we can only wrap globally
  mapOwn(bodyMethods, function (i, name) {
    wrapPromiseMethod(baseEE, Req[proto], name, bodyPrefix);
    wrapPromiseMethod(baseEE, Res[proto], name, bodyPrefix);
  });
  var wrappedFetch = wrapFetch(baseEE);
  win.fetch = wrappedFetch;
}
function wrapFetch(sharedEE) {
  var fn = originals/* originals.FETCH */.Y.FETCH;
  var ee = sharedEE || contextual_ee.ee;
  var wrappedFetch = wrapPromiseMethod(ee, fn, prefix);
  ee.on(prefix + 'end', function (err, res) {
    var ctx = this;

    if (res) {
      var size = res.headers.get('content-length');

      if (size !== null) {
        ctx.rxSize = size;
      }

      ee.emit(prefix + 'done', [null, res], ctx);
    } else {
      ee.emit(prefix + 'done', [err], ctx);
    }
  });
  return wrappedFetch;
} // this should probably go to the common module as a part of wrapping utility functions

function wrapPromiseMethod(ee, fn, prefix) {
  return function nrWrapper() {
    var args = lodash_slice_default()(arguments);
    var ctx = {}; // we are wrapping args in an array so we can preserve the reference

    ee.emit(prefix + 'before-start', [args], ctx);
    var dtPayload;
    if (ctx[ctxId] && ctx[ctxId].dt) dtPayload = ctx[ctxId].dt;
    var promise = fn.apply(this, args);
    ee.emit(prefix + 'start', [args, dtPayload], promise);
    return promise.then(function (val) {
      ee.emit(prefix + 'end', [null, val], promise);
      return val;
    }, function (err) {
      ee.emit(prefix + 'end', [err], promise);
      throw err;
    });
  };
}

function scopedEE(sharedEE) {
  return (sharedEE || baseEE).get('events');
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/wrap/wrap-function.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


var flag = 'nr@original';
var has = Object.prototype.hasOwnProperty;
var inWrapper = false; // eslint-disable-next-line

/* harmony default export */ var wrap_function = (createWrapperWithEmitter);
function createWrapperWithEmitter(emitter, always) {
  emitter || (emitter = contextual_ee.ee);
  wrapFn.inPlace = inPlace;
  wrapFn.flag = flag;
  return wrapFn;

  function wrapFn(fn, prefix, getContext, methodName, bubble) {
    // Unless fn is both wrappable and unwrapped, return it unchanged.
    if (notWrappable(fn)) return fn;
    if (!prefix) prefix = '';
    nrWrapper[flag] = fn;
    copy(fn, nrWrapper, emitter);
    return nrWrapper;

    function nrWrapper() {
      var args;
      var originalThis;
      var ctx;
      var result;

      try {
        originalThis = this;
        args = lodash_slice_default()(arguments);

        if (typeof getContext === 'function') {
          ctx = getContext(args, originalThis);
        } else {
          ctx = getContext || {};
        }
      } catch (e) {
        report([e, '', [args, originalThis, methodName], ctx], emitter);
      } // Warning: start events may mutate args!


      safeEmit(prefix + 'start', [args, originalThis, methodName], ctx, bubble);

      try {
        result = fn.apply(originalThis, args);
        return result;
      } catch (err) {
        safeEmit(prefix + 'err', [args, originalThis, err], ctx, bubble); // rethrow error so we don't effect execution by observing.

        throw err;
      } finally {
        // happens no matter what.
        safeEmit(prefix + 'end', [args, originalThis, result], ctx, bubble);
      }
    }
  }

  function inPlace(obj, methods, prefix, getContext, bubble) {
    // log('methods!', methods)
    if (!prefix) prefix = ''; // If prefix starts with '-' set this boolean to add the method name to
    // the prefix before passing each one to wrap.

    var prependMethodPrefix = prefix.charAt(0) === '-';
    var fn;
    var method;
    var i;

    for (i = 0; i < methods.length; i++) {
      method = methods[i];
      fn = obj[method]; // Unless fn is both wrappable and unwrapped bail,
      // so we don't add extra properties with undefined values.

      if (notWrappable(fn)) continue;
      obj[method] = wrapFn(fn, prependMethodPrefix ? method + prefix : prefix, getContext, method, bubble);
    }
  }

  function safeEmit(evt, arr, store, bubble) {
    if (inWrapper && !always) return;
    var prev = inWrapper;
    inWrapper = true;

    try {
      emitter.emit(evt, arr, store, always, bubble);
    } catch (e) {
      report([e, evt, arr, store], emitter);
    }

    inWrapper = prev;
  }
}

function report(args, emitter) {
  emitter || (emitter = contextual_ee.ee);

  try {
    emitter.emit('internal-error', args);
  } catch (err) {// do nothing
  }
}

function copy(from, to, emitter) {
  if (Object.defineProperty && Object.keys) {
    // Create accessors that proxy to actual function
    try {
      var keys = Object.keys(from); // eslint-disable-next-line

      keys.forEach(function (key) {
        Object.defineProperty(to, key, {
          get: function get() {
            return from[key];
          },
          // eslint-disable-next-line
          set: function set(val) {
            from[key] = val;
            return val;
          }
        });
      });
      return to;
    } catch (e) {
      report([e], emitter);
    }
  } // fall back to copying properties


  for (var i in from) {
    if (has.call(from, i)) {
      to[i] = from[i];
    }
  }

  return to;
}

function notWrappable(fn) {
  return !(fn && fn instanceof Function && fn.apply && !fn[flag]);
}

function wrapFunction(fn, wrapper) {
  var wrapped = wrapper(fn);
  wrapped[flag] = fn;
  copy(fn, wrapped, ee);
  return wrapped;
}
function wrapInPlace(obj, fnName, wrapper) {
  var fn = obj[fnName];
  obj[fnName] = wrapFunction(fn, wrapper);
}
function argsToArray() {
  var len = arguments.length;
  var arr = new Array(len);

  for (var i = 0; i < len; ++i) {
    arr[i] = arguments[i];
  }

  return arr;
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/wrap/wrap-timer.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

 //eslint-disable-next-line

function wrapTimer(sharedEE) {
  var ee = wrap_timer_scopedEE(sharedEE);
  var wrapFn = createWrapperWithEmitter(ee);
  var SET_TIMEOUT = 'setTimeout';
  var SET_INTERVAL = 'setInterval';
  var CLEAR_TIMEOUT = 'clearTimeout';
  var START = '-start';
  var DASH = '-'; // log('wrap timer...')

  wrapFn.inPlace(window, [SET_TIMEOUT, 'setImmediate'], SET_TIMEOUT + DASH);
  wrapFn.inPlace(window, [SET_INTERVAL], SET_INTERVAL + DASH);
  wrapFn.inPlace(window, [CLEAR_TIMEOUT, 'clearImmediate'], CLEAR_TIMEOUT + DASH);
  ee.on(SET_INTERVAL + START, interval);
  ee.on(SET_TIMEOUT + START, timer);

  function interval(args, obj, type) {
    args[0] = wrapFn(args[0], 'fn-', null, type);
  }

  function timer(args, obj, type) {
    this.method = type;
    this.timerDuration = isNaN(args[1]) ? 0 : +args[1];
    args[0] = wrapFn(args[0], 'fn-', this, type);
  }

  return ee;
}
function wrap_timer_scopedEE(sharedEE) {
  return (sharedEE || contextual_ee.ee).get('timer');
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/wrap/wrap-raf.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// Request Animation Frame wrapper


function wrapRaf(sharedEE) {
  var ee = wrap_raf_scopedEE(sharedEE);
  var wrapFn = createWrapperWithEmitter(ee);
  var equestAnimationFrame = 'equestAnimationFrame';
  wrapFn.inPlace(window, ['r' + equestAnimationFrame, 'mozR' + equestAnimationFrame, 'webkitR' + equestAnimationFrame, 'msR' + equestAnimationFrame], 'raf-');
  ee.on('raf-start', function (args) {
    // Wrap the callback handed to requestAnimationFrame
    args[0] = wrapFn(args[0], 'fn-');
  });
  return ee;
}
function wrap_raf_scopedEE(sharedEE) {
  return (sharedEE || contextual_ee.ee).get('raf');
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/wrap/wrap-history.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// History pushState wrapper


function wrapHistory(sharedEE) {
  var ee = wrap_history_scopedEE(sharedEE);
  var wrapFn = createWrapperWithEmitter(ee);
  var prototype = window.history && window.history.constructor && window.history.constructor.prototype;
  var object = window.history;

  if (prototype && prototype.pushState && prototype.replaceState) {
    object = prototype;
  } // log('wrap history')


  wrapFn.inPlace(object, ['pushState', 'replaceState'], '-');
  return ee;
}
3;
function wrap_history_scopedEE(sharedEE) {
  return (sharedEE || contextual_ee.ee).get('history');
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-listener/event-listener-opts.js
var event_listener_opts = __webpack_require__(3207);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/wrap/wrap-xhr.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// wrap-events patches XMLHttpRequest.prototype.addEventListener for us.
 // import * as config from '../config'




 // eslint-disable-next-line

function wrapXhr(sharedEE) {
  var baseEE = sharedEE || contextual_ee.ee;
  var ee = wrap_xhr_scopedEE(baseEE);
  var wrapFn = createWrapperWithEmitter(ee);
  var OrigXHR = originals/* originals.XHR */.Y.XHR;
  var MutationObserver = originals/* originals.MO */.Y.MO;
  var Promise = originals/* originals.PR */.Y.PR;
  var setImmediate = originals/* originals.SI */.Y.SI;
  var READY_STATE_CHANGE = 'readystatechange';
  var handlers = ['onload', 'onerror', 'onabort', 'onloadstart', 'onloadend', 'onprogress', 'ontimeout'];
  var pendingXhrs = [];

  var XHR = window.XMLHttpRequest = function (opts) {
    var xhr = new OrigXHR(opts);

    try {
      ee.emit('new-xhr', [xhr], xhr);
      xhr.addEventListener(READY_STATE_CHANGE, wrapXHR, (0,event_listener_opts/* eventListenerOpts */.m)(false));
    } catch (e) {
      try {
        ee.emit('internal-error', [e]);
      } catch (err) {// do nothing
      }
    }

    return xhr;
  };

  copy(OrigXHR, XHR);
  XHR.prototype = OrigXHR.prototype; // log('wrap xhr...')

  wrapFn.inPlace(XHR.prototype, ['open', 'send'], '-xhr-', getObject);
  ee.on('send-xhr-start', function (args, xhr) {
    wrapOnreadystatechange(args, xhr);
    enqueuePendingXhr(xhr);
  });
  ee.on('open-xhr-start', wrapOnreadystatechange);

  function wrapOnreadystatechange(args, xhr) {
    wrapFn.inPlace(xhr, ['onreadystatechange'], 'fn-', getObject);
  }

  function wrapXHR() {
    var xhr = this;
    var ctx = ee.context(xhr);

    if (xhr.readyState > 3 && !ctx.resolved) {
      ctx.resolved = true;
      ee.emit('xhr-resolved', [], xhr);
    }

    wrapFn.inPlace(xhr, handlers, 'fn-', getObject);
  } // Wrapping the onreadystatechange property of XHRs takes some special tricks.
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


  if (MutationObserver) {
    var resolved = Promise && Promise.resolve();

    if (!setImmediate && !Promise) {
      var toggle = 1;
      var dummyNode = document.createTextNode(toggle);
      new MutationObserver(drainPendingXhrs).observe(dummyNode, {
        characterData: true
      });
    }
  } else {
    baseEE.on('fn-end', function (args) {
      // We don't want to try to wrap onreadystatechange from within a
      // readystatechange callback.
      if (args[0] && args[0].type === READY_STATE_CHANGE) return;
      drainPendingXhrs();
    });
  }

  function enqueuePendingXhr(xhr) {
    pendingXhrs.push(xhr);

    if (MutationObserver) {
      if (resolved) {
        resolved.then(drainPendingXhrs);
      } else if (setImmediate) {
        setImmediate(drainPendingXhrs);
      } else {
        toggle = -toggle;
        dummyNode.data = toggle;
      }
    }
  }

  function drainPendingXhrs() {
    for (var i = 0; i < pendingXhrs.length; i++) {
      wrapOnreadystatechange([], pendingXhrs[i]);
    }

    if (pendingXhrs.length) pendingXhrs = [];
  } // Use the object these methods are on as their
  // context store for the event emitter


  function getObject(args, obj) {
    return obj;
  }

  function copy(from, to) {
    for (var i in from) {
      to[i] = from[i];
    }

    return to;
  }

  return ee;
}
function wrap_xhr_scopedEE(sharedEE) {
  return (sharedEE || contextual_ee.ee).get('events');
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/get-or-set.js
var get_or_set = __webpack_require__(1403);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/wrap/wrap-events.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */



function wrapEvents(sharedEE) {
  var ee = wrap_events_scopedEE(sharedEE);
  var wrapFn = createWrapperWithEmitter(ee, true);
  var XHR = XMLHttpRequest;
  var ADD_EVENT_LISTENER = 'addEventListener';
  var REMOVE_EVENT_LISTENER = 'removeEventListener'; // Guard against instrumenting environments w/o necessary features

  if ('getPrototypeOf' in Object) {
    findAndWrapNode(document);
    findAndWrapNode(window);
    findAndWrapNode(XHR.prototype); // eslint-disable-next-line
  } else if (XHR.prototype.hasOwnProperty(ADD_EVENT_LISTENER)) {
    wrapNode(window);
    wrapNode(XHR.prototype);
  }

  ee.on(ADD_EVENT_LISTENER + '-start', function (args, target) {
    var originalListener = args[1];

    if (originalListener === null || typeof originalListener !== 'function' && _typeof(originalListener) !== 'object') {
      return;
    }

    var wrapped = (0,get_or_set/* getOrSet */.X)(originalListener, 'nr@wrapped', function () {
      var listener = {
        object: wrapHandleEvent,
        'function': originalListener
      }[_typeof(originalListener)];

      return listener ? wrapFn(listener, 'fn-', null, listener.name || 'anonymous') : originalListener;

      function wrapHandleEvent() {
        if (typeof originalListener.handleEvent !== 'function') return;
        return originalListener.handleEvent.apply(originalListener, arguments);
      }
    });
    this.wrapped = args[1] = wrapped;
  });
  ee.on(REMOVE_EVENT_LISTENER + '-start', function (args) {
    args[1] = this.wrapped || args[1];
  });

  function findAndWrapNode(object) {
    var step = object; // eslint-disable-next-line

    while (step && !step.hasOwnProperty(ADD_EVENT_LISTENER)) {
      step = Object.getPrototypeOf(step);
    }

    if (step) {
      wrapNode(step);
    }
  }

  function wrapNode(node) {
    wrapFn.inPlace(node, [ADD_EVENT_LISTENER, REMOVE_EVENT_LISTENER], '-', uniqueListener);
  }

  function uniqueListener(args, obj) {
    // Context for the listener is stored on itself.
    return args[1];
  }

  return ee;
}
function wrap_events_scopedEE(sharedEE) {
  return (sharedEE || contextual_ee.ee).get('events');
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/wrap/index.js










function wrap_wrapEvents(sharedEE) {
  return wrapEvents(sharedEE);
}
function wrap_wrapFetch(sharedEE) {
  return wrapFetch(sharedEE);
}
function wrap_wrapHistory(sharedEE) {
  return wrapHistory(sharedEE);
}
function wrapJson(sharedEE) {
  return wj(sharedEE);
}
function wrapMutation(sharedEE) {
  return wm(sharedEE);
}
function wrapPromise(sharedEE) {
  return wp(sharedEE);
}
function wrap_wrapRaf(sharedEE) {
  return wrapRaf(sharedEE);
}
function wrap_wrapTimer(sharedEE) {
  return wrapTimer(sharedEE);
}
function wrap_wrapXhr(sharedEE) {
  return wrapXhr(sharedEE);
}

/***/ }),

/***/ 441:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Aggregate": function() { return /* binding */ Aggregate; }
});

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-emitter/register-handler.js
var register_handler = __webpack_require__(8244);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/stringify.js
var stringify = __webpack_require__(902);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/serialize/bel-serializer.js
var bel_serializer = __webpack_require__(6389);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-emitter/handle.js
var handle = __webpack_require__(8668);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/init.js
var init = __webpack_require__(1311);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/info.js
var info = __webpack_require__(1525);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/harvest/harvest-scheduler.js + 1 modules
var harvest_scheduler = __webpack_require__(6898);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/unload/unload.js + 2 modules
var unload = __webpack_require__(1261);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/metrics/metrics.js
var metrics_metrics = __webpack_require__(8915);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/ajax/aggregate/deny-list.js
// export default {
//   shouldCollectEvent: shouldCollectEvent,
//   setDenyList: setDenyList
// }
var denyList = [];
function shouldCollectEvent(params) {
  if (denyList.length === 0) {
    return true;
  }

  for (var i = 0; i < denyList.length; i++) {
    var parsed = denyList[i];

    if (parsed.hostname === '*') {
      return false;
    }

    if (domainMatchesPattern(parsed.hostname, params.hostname) && comparePath(parsed.pathname, params.pathname)) {
      return false;
    }
  }

  return true;
}
function setDenyList(denyListConfig) {
  denyList = [];

  if (!denyListConfig || !denyListConfig.length) {
    return;
  }

  for (var i = 0; i < denyListConfig.length; i++) {
    var url = denyListConfig[i];

    if (url.indexOf('http://') === 0) {
      url = url.substring(7);
    } else if (url.indexOf('https://') === 0) {
      url = url.substring(8);
    }

    var firstSlash = url.indexOf('/');

    if (firstSlash > 0) {
      denyList.push({
        hostname: url.substring(0, firstSlash),
        pathname: url.substring(firstSlash)
      });
    } else {
      denyList.push({
        hostname: url,
        pathname: ''
      });
    }
  }
} // returns true if the right side of the domain matches the pattern

function domainMatchesPattern(pattern, domain) {
  if (pattern.length > domain.length) {
    return false;
  }

  if (domain.indexOf(pattern) === domain.length - pattern.length) {
    return true;
  }

  return false;
}

function comparePath(pattern, path) {
  if (pattern.indexOf('/') === 0) {
    pattern = pattern.substring(1);
  }

  if (path.indexOf('/') === 0) {
    path = path.substring(1);
  } // no path in pattern means match all paths


  if (pattern === '') {
    return true;
  }

  if (pattern === path) {
    return true;
  }

  return false;
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/feature-base.js
var feature_base = __webpack_require__(9077);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/ajax/aggregate/index.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */










var Aggregate = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Aggregate, _FeatureBase);

  var _super = _createSuper(Aggregate);

  function Aggregate(agentIdentifier, aggregator) {
    var _this;

    _classCallCheck(this, Aggregate);

    _this = _super.call(this, agentIdentifier, aggregator);
    _this.ajaxEvents = [];
    _this.spaAjaxEvents = {};
    _this.sentAjaxEvents = [];
    _this.scheduler;
    _this.harvestTimeSeconds = (0,init/* getConfigurationValue */.Mt)(_this.agentIdentifier, 'ajax.harvestTimeSeconds') || 10;
    _this.MAX_PAYLOAD_SIZE = (0,init/* getConfigurationValue */.Mt)(_this.agentIdentifier, 'ajax.maxPayloadSize') || 1000000;

    _this.ee.on('interactionSaved', function (interaction) {
      if (!this.spaAjaxEvents[interaction.id]) return; // remove from the spaAjaxEvents buffer, and let spa harvest it

      delete this.spaAjaxEvents[interaction.id];
    });

    _this.ee.on('interactionDiscarded', function (interaction) {
      if (!this.spaAjaxEvents[interaction.id] || !this.allAjaxIsEnabled()) return;
      this.spaAjaxEvents[interaction.id].forEach(function (item) {
        // move it from the spaAjaxEvents buffer to the ajaxEvents buffer for harvesting here
        this.ajaxEvents.push(item);
      });
      delete this.spaAjaxEvents[interaction.id];
    });

    if (_this.allAjaxIsEnabled()) setDenyList((0,init/* getConfigurationValue */.Mt)(_this.agentIdentifier, 'ajax.deny_list'));
    (0,register_handler/* registerHandler */.XN)('xhr', function () {
      var _this2;

      return (_this2 = _this).storeXhr.apply(_this2, arguments);
    }, undefined, _this.ee);

    if (_this.allAjaxIsEnabled()) {
      _this.scheduler = new harvest_scheduler/* HarvestScheduler */.o('events', {
        onFinished: function onFinished() {
          var _this3;

          return (_this3 = _this).onEventsHarvestFinished.apply(_this3, arguments);
        },
        getPayload: function getPayload() {
          var _this4;

          return (_this4 = _this).prepareHarvest.apply(_this4, arguments);
        }
      });

      _this.scheduler.harvest.on('jserrors', function () {
        return {
          body: this.aggregator.take(['xhr'])
        };
      });

      _this.scheduler.startTimer(_this.harvestTimeSeconds);

      (0,unload/* subscribeToUnload */.l)(function () {
        var _this5;

        return (_this5 = _this).finalHarvest.apply(_this5, arguments);
      });
    }

    return _this;
  } // export { shouldCollectEvent }
  // export { setDenyList }


  _createClass(Aggregate, [{
    key: "getStoredEvents",
    value: function getStoredEvents() {
      return {
        ajaxEvents: this.ajaxEvents,
        spaAjaxEvents: this.spaAjaxEvents
      };
    }
  }, {
    key: "storeXhr",
    value: function storeXhr(params, metrics, startTime, endTime, type) {
      if (params.hostname === 'localhost') {
        return;
      }

      metrics.time = startTime; // send to session traces

      var hash;

      if (params.cat) {
        hash = (0,stringify/* stringify */.P)([params.status, params.cat]);
      } else {
        hash = (0,stringify/* stringify */.P)([params.status, params.host, params.pathname]);
      }

      (0,handle/* handle */.pr)('bstXhrAgg', ['xhr', hash, params, metrics], undefined, undefined, this.ee); // store as metric

      this.aggregator.store('xhr', hash, params, metrics);

      if (!this.allAjaxIsEnabled()) {
        return;
      }

      if (!shouldCollectEvent(params)) {
        if (params.hostname === (0,info/* getInfo */.C)(this.agentIdentifier).errorBeacon) {
          (0,metrics_metrics/* recordSupportability */.VB)('Ajax/Events/Excluded/Agent');
        } else {
          (0,metrics_metrics/* recordSupportability */.VB)('Ajax/Events/Excluded/App');
        }

        return;
      }

      var xhrContext = this;
      var event = {
        method: params.method,
        status: params.status,
        domain: params.host,
        path: params.pathname,
        requestSize: metrics.txSize,
        responseSize: metrics.rxSize,
        type: type,
        startTime: startTime,
        endTime: endTime,
        callbackDuration: metrics.cbTime
      };

      if (xhrContext.dt) {
        event.spanId = xhrContext.dt.spanId;
        event.traceId = xhrContext.dt.traceId;
        event.spanTimestamp = xhrContext.dt.timestamp;
      } // if the ajax happened inside an interaction, hold it until the interaction finishes


      if (this.spaNode) {
        var interactionId = this.spaNode.interaction.id;
        this.spaAjaxEvents[interactionId] = this.spaAjaxEvents[interactionId] || [];
        this.spaAjaxEvents[interactionId].push(event);
      } else {
        this.ajaxEvents.push(event);
      }
    }
  }, {
    key: "prepareHarvest",
    value: function prepareHarvest(options) {
      options = options || {};

      if (this.ajaxEvents.length === 0) {
        return null;
      }

      var payload = this.getPayload(this.ajaxEvents, options.maxPayloadSize || this.MAX_PAYLOAD_SIZE);
      var payloadObjs = [];

      for (var i = 0; i < payload.length; i++) {
        payloadObjs.push({
          body: {
            e: payload[i]
          }
        });
      }

      if (options.retry) {
        this.sentAjaxEvents = this.ajaxEvents.slice();
      }

      this.ajaxEvents = [];
      return payloadObjs;
    }
  }, {
    key: "getPayload",
    value: function getPayload(events, maxPayloadSize, chunks) {
      chunks = chunks || 1;
      var payload = [];
      var chunkSize = events.length / chunks;
      var eventChunks = this.splitChunks(events, chunkSize);
      var tooBig = false;

      for (var i = 0; i < eventChunks.length; i++) {
        var currentChunk = eventChunks[i];

        if (currentChunk.tooBig(maxPayloadSize)) {
          if (currentChunk.events.length !== 1) {
            /* if it is too big BUT it isnt length 1, we can split it down again,
             else we just want to NOT push it into payload
             because if it's length 1 and still too big for the maxPayloadSize
             it cant get any smaller and we dont want to recurse forever */
            tooBig = true;
            break;
          }
        } else {
          payload.push(currentChunk.payload);
        }
      } // check if the current payload string is too big, if so then run getPayload again with more buckets


      return tooBig ? this.getPayload(events, maxPayloadSize, ++chunks) : payload;
    }
  }, {
    key: "onEventsHarvestFinished",
    value: function onEventsHarvestFinished(result) {
      if (result.retry && this.sentAjaxEvents.length > 0 && this.allAjaxIsEnabled()) {
        this.ajaxEvents = this.ajaxEvents.concat(this.sentAjaxEvents);
        this.sentAjaxEvents = [];
      }
    }
  }, {
    key: "splitChunks",
    value: function splitChunks(arr, chunkSize) {
      chunkSize = chunkSize || arr.length;
      var chunks = [];

      for (var i = 0, len = arr.length; i < len; i += chunkSize) {
        chunks.push(new this.Chunk(arr.slice(i, i + chunkSize)));
      }

      return chunks;
    }
  }, {
    key: "Chunk",
    value: function Chunk(events) {
      this.addString = (0,bel_serializer/* getAddStringContext */.FX)(); // pass agentIdentifier here

      this.events = events;
      this.payload = 'bel.7;';

      for (var i = 0; i < this.events.length; i++) {
        var event = this.events[i];
        var fields = [(0,bel_serializer/* numeric */.uR)(event.startTime), (0,bel_serializer/* numeric */.uR)(event.endTime - event.startTime), (0,bel_serializer/* numeric */.uR)(0), // callbackEnd
        (0,bel_serializer/* numeric */.uR)(0), // no callbackDuration for non-SPA events
        this.addString(event.method), (0,bel_serializer/* numeric */.uR)(event.status), this.addString(event.domain), this.addString(event.path), (0,bel_serializer/* numeric */.uR)(event.requestSize), (0,bel_serializer/* numeric */.uR)(event.responseSize), event.type === 'fetch' ? 1 : '', this.addString(0), // nodeId
        (0,bel_serializer/* nullable */.AG)(event.spanId, this.addString, true) + // guid
        (0,bel_serializer/* nullable */.AG)(event.traceId, this.addString, true) + // traceId
        (0,bel_serializer/* nullable */.AG)(event.spanTimestamp, bel_serializer/* numeric */.uR, false) // timestamp
        ];
        var insert = '2,'; // add custom attributes

        var attrParts = (0,bel_serializer/* addCustomAttributes */.n1)((0,info/* getInfo */.C)(this.agentIdentifier).jsAttributes || {}, this.addString);
        fields.unshift((0,bel_serializer/* numeric */.uR)(attrParts.length));
        insert += fields.join(',');

        if (attrParts && attrParts.length > 0) {
          insert += ';' + attrParts.join(';');
        }

        if (i + 1 < this.events.length) insert += ';';
        this.payload += insert;
      }

      this.tooBig = function (maxPayloadSize) {
        maxPayloadSize = maxPayloadSize || this.MAX_PAYLOAD_SIZE;
        return this.payload.length * 2 > maxPayloadSize;
      };
    }
  }, {
    key: "allAjaxIsEnabled",
    value: function allAjaxIsEnabled() {
      var enabled = (0,init/* getConfigurationValue */.Mt)(this.agentIdentifier, 'ajax.enabled');

      if (enabled === false) {
        return false;
      }

      return true;
    }
  }]);

  return Aggregate;
}(feature_base/* FeatureBase */.W);

/***/ }),

/***/ 4539:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Instrument": function() { return /* binding */ Instrument; },
  "getWrappedFetch": function() { return /* binding */ getWrappedFetch; }
});

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/originals.js
var originals = __webpack_require__(5301);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/runtime.js + 1 modules
var runtime = __webpack_require__(2469);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/loader-config.js
var state_loader_config = __webpack_require__(6146);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-emitter/handle.js
var handle = __webpack_require__(8668);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-emitter/contextual-ee.js
var contextual_ee = __webpack_require__(2666);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/get-or-set.js
var get_or_set = __webpack_require__(1403);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/ids/id.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// Start assigning ids at 1 so 0 can always be used for window, without
// actually setting it (which would create a global variable).

var index = 1;
var prop = 'nr@id'; // export default id
// Always returns id of obj, may tag obj with an id in the process.

function id(obj) {
  var type = _typeof(obj); // We can only tag objects, functions, and arrays with ids.
  // For all primitive values we instead return -1.


  if (!obj || !(type === 'object' || type === 'function')) return -1;
  if (obj === window) return 0;
  return (0,get_or_set/* getOrSet */.X)(obj, prop, function () {
    return index++;
  });
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/browser-version/firefox-version.js
var firefox_version = __webpack_require__(6062);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/util/data-size.js
function data_size_typeof(obj) { "@babel/helpers - typeof"; return data_size_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, data_size_typeof(obj); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
function dataSize(data) {
  if (typeof data === 'string' && data.length) return data.length;
  if (data_size_typeof(data) !== 'object') return undefined;
  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer && data.byteLength) return data.byteLength;
  if (typeof Blob !== 'undefined' && data instanceof Blob && data.size) return data.size;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return undefined;

  try {
    return JSON.stringify(data).length;
  } catch (e) {
    return undefined;
  }
} // export default dataSize
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-listener/event-listener-opts.js
var event_listener_opts = __webpack_require__(3207);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/timing/now.js
var now = __webpack_require__(9433);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/wrap/index.js + 7 modules
var wrap = __webpack_require__(7423);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/url/parse-url.js
var parse_url = __webpack_require__(5060);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/init.js
var init = __webpack_require__(1311);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/ids/unique-id.js
var unique_id = __webpack_require__(3077);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/ajax/instrument/distributed-tracing.js
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */



var DT = /*#__PURE__*/function () {
  function DT(agentIdentifier) {
    _classCallCheck(this, DT);

    this.agentIdentifier = agentIdentifier;
  }

  _createClass(DT, [{
    key: "generateTracePayload",
    value: function generateTracePayload(parsedOrigin) {
      if (!this.shouldGenerateTrace(parsedOrigin)) {
        return null;
      }

      var loader_config = (0,state_loader_config/* getLoaderConfig */.D)(this.agentIdentifier);

      if (!loader_config) {
        return null;
      }

      var accountId = (loader_config.accountID || '').toString() || null;
      var agentId = (loader_config.agentID || '').toString() || null;
      var trustKey = (loader_config.trustKey || '').toString() || null;

      if (!accountId || !agentId) {
        return null;
      }

      var spanId = (0,unique_id/* generateSpanId */.M)();
      var traceId = (0,unique_id/* generateTraceId */.Ht)();
      var timestamp = Date.now();
      var payload = {
        spanId: spanId,
        traceId: traceId,
        timestamp: timestamp
      };

      if (parsedOrigin.sameOrigin || this.isAllowedOrigin(parsedOrigin) && this.useTraceContextHeadersForCors()) {
        payload.traceContextParentHeader = this.generateTraceContextParentHeader(spanId, traceId);
        payload.traceContextStateHeader = this.generateTraceContextStateHeader(spanId, timestamp, accountId, agentId, trustKey);
      }

      if (parsedOrigin.sameOrigin && !this.excludeNewrelicHeader() || !parsedOrigin.sameOrigin && this.isAllowedOrigin(parsedOrigin) && this.useNewrelicHeaderForCors()) {
        payload.newrelicHeader = this.generateTraceHeader(spanId, traceId, timestamp, accountId, agentId, trustKey);
      }

      return payload;
    }
  }, {
    key: "generateTraceContextParentHeader",
    value: function generateTraceContextParentHeader(spanId, traceId) {
      return '00-' + traceId + '-' + spanId + '-01';
    }
  }, {
    key: "generateTraceContextStateHeader",
    value: function generateTraceContextStateHeader(spanId, timestamp, accountId, appId, trustKey) {
      var version = 0;
      var transactionId = '';
      var parentType = 1;
      var sampled = '';
      var priority = '';
      return trustKey + '@nr=' + version + '-' + parentType + '-' + accountId + '-' + appId + '-' + spanId + '-' + transactionId + '-' + sampled + '-' + priority + '-' + timestamp;
    }
  }, {
    key: "generateTraceHeader",
    value: function generateTraceHeader(spanId, traceId, timestamp, accountId, appId, trustKey) {
      var hasBtoa = 'btoa' in window && typeof window.btoa === 'function';

      if (!hasBtoa) {
        return null;
      }

      var payload = {
        v: [0, 1],
        d: {
          ty: 'Browser',
          ac: accountId,
          ap: appId,
          id: spanId,
          tr: traceId,
          ti: timestamp
        }
      };

      if (trustKey && accountId !== trustKey) {
        payload.d.tk = trustKey;
      }

      return btoa(JSON.stringify(payload));
    } // return true if DT is enabled and the origin is allowed, either by being
    // same-origin, or included in the allowed list

  }, {
    key: "shouldGenerateTrace",
    value: function shouldGenerateTrace(parsedOrigin) {
      return this.isDtEnabled() && this.isAllowedOrigin(parsedOrigin);
    }
  }, {
    key: "isAllowedOrigin",
    value: function isAllowedOrigin(parsedOrigin) {
      var allowed = false;
      var dtConfig = {};
      var dt = (0,init/* getConfigurationValue */.Mt)('distributed_tracing');

      if (dt) {
        dtConfig = (0,init/* getConfiguration */.P_)().distributed_tracing;
      }

      if (parsedOrigin.sameOrigin) {
        allowed = true;
      } else if (dtConfig.allowed_origins instanceof Array) {
        for (var i = 0; i < dtConfig.allowed_origins.length; i++) {
          var allowedOrigin = (0,parse_url/* parseUrl */.e)(dtConfig.allowed_origins[i]);

          if (parsedOrigin.hostname === allowedOrigin.hostname && parsedOrigin.protocol === allowedOrigin.protocol && parsedOrigin.port === allowedOrigin.port) {
            allowed = true;
            break;
          }
        }
      }

      return allowed;
    }
  }, {
    key: "isDtEnabled",
    value: function isDtEnabled() {
      var dt = (0,init/* getConfigurationValue */.Mt)(this.agentIdentifier, 'distributed_tracing');

      if (dt) {
        return !!dt.enabled;
      }

      return false;
    } // exclude the newrelic header for same-origin calls

  }, {
    key: "excludeNewrelicHeader",
    value: function excludeNewrelicHeader() {
      var dt = (0,init/* getConfigurationValue */.Mt)(this.agentIdentifier, 'distributed_tracing');

      if (dt) {
        return !!dt.exclude_newrelic_header;
      }

      return false;
    }
  }, {
    key: "useNewrelicHeaderForCors",
    value: function useNewrelicHeaderForCors() {
      var dt = (0,init/* getConfigurationValue */.Mt)(this.agentIdentifier, 'distributed_tracing');

      if (dt) {
        return dt.cors_use_newrelic_header !== false;
      }

      return false;
    }
  }, {
    key: "useTraceContextHeadersForCors",
    value: function useTraceContextHeadersForCors() {
      var dt = (0,init/* getConfigurationValue */.Mt)(this.agentIdentifier, 'distributed_tracing');

      if (dt) {
        return !dt.cors_use_tracecontext_headers;
      }

      return false;
    }
  }]);

  return DT;
}();
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/ajax/instrument/response-size.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
 // export default responseSizeFromXhr

function responseSizeFromXhr(xhr, lastSize) {
  var type = xhr.responseType;
  if (type === 'json' && lastSize !== null) return lastSize; // Caution! Chrome throws an error if you try to access xhr.responseText for binary data

  if (type === 'arraybuffer' || type === 'blob' || type === 'json') {
    return dataSize(xhr.response);
  } else if (type === 'text' || type === '' || type === undefined) {
    // empty string type defaults to 'text'
    return dataSize(xhr.responseText);
  } else {
    // e.g. ms-stream and document (we do not currently determine the size of Document objects)
    return undefined;
  }
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/feature-base.js
var feature_base = __webpack_require__(9077);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/ajax/instrument/index.js
function instrument_typeof(obj) { "@babel/helpers - typeof"; return instrument_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, instrument_typeof(obj); }

function instrument_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function instrument_createClass(Constructor, protoProps, staticProps) { if (protoProps) instrument_defineProperties(Constructor.prototype, protoProps); if (staticProps) instrument_defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function instrument_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (instrument_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */













var handlers = ['load', 'error', 'abort', 'timeout'];
var handlersLen = handlers.length;
var origRequest = originals/* originals.REQ */.Y.REQ;
var origXHR = window.XMLHttpRequest;
var Instrument = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Instrument, _FeatureBase);

  var _super = _createSuper(Instrument);

  function Instrument(agentIdentifier) {
    var _this;

    instrument_classCallCheck(this, Instrument);

    _this = _super.call(this, agentIdentifier); // Don't instrument Chrome for iOS, it is buggy and acts like there are URL verification issues

    if (!(0,runtime/* getRuntime */.O)(_this.agentIdentifier).xhrWrappable || (0,runtime/* getRuntime */.O)(_this.agentIdentifier).disabled) return _possibleConstructorReturn(_this);
    _this.dt = new DT(_this.agentIdentifier);
    return _this;
  }

  return instrument_createClass(Instrument);
}(feature_base/* FeatureBase */.W); // TODO update all of this to go into class and use this.ee for ee, handle, and register

function getWrappedFetch() {
  var wrappedFetch = (0,wrap/* wrapFetch */.u5)(contextual_ee.ee);
  subscribeToEvents(contextual_ee.ee, handle/* handle */.pr);
  return wrappedFetch;
}

function subscribeToEvents(ee, handle) {
  ee.on('new-xhr', onNewXhr);
  ee.on('open-xhr-start', onOpenXhrStart);
  ee.on('open-xhr-end', onOpenXhrEnd);
  ee.on('send-xhr-start', onSendXhrStart);
  ee.on('xhr-cb-time', onXhrCbTime);
  ee.on('xhr-load-added', onXhrLoadAdded);
  ee.on('xhr-load-removed', onXhrLoadRemoved);
  ee.on('xhr-resolved', onXhrResolved);
  ee.on('addEventListener-end', onAddEventListenerEnd);
  ee.on('removeEventListener-end', onRemoveEventListenerEnd);
  ee.on('fn-end', onFnEnd);
  ee.on('fetch-before-start', onFetchBeforeStart);
  ee.on('fetch-start', onFetchStart);
  ee.on('fn-start', onFnStart);
  ee.on('fetch-done', onFetchDone); // Setup the context for each new xhr object

  function onNewXhr(xhr) {
    var ctx = this;
    ctx.totalCbs = 0;
    ctx.called = 0;
    ctx.cbTime = 0;
    ctx.end = end;
    ctx.ended = false;
    ctx.xhrGuids = {};
    ctx.lastSize = null;
    ctx.loadCaptureCalled = false;
    ctx.params = this.params || {};
    ctx.metrics = this.metrics || {};
    xhr.addEventListener('load', function (event) {
      captureXhrData(ctx, xhr);
    }, (0,event_listener_opts/* eventListenerOpts */.m)(false)); // In Firefox 34+, XHR ProgressEvents report pre-content-decoding sizes via
    // their 'loaded' property, rather than post-decoding sizes. We want
    // post-decoding sizes for consistency with browsers where that's all we have.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1227674
    //
    // In really old versions of Firefox (older than somewhere between 5 and 10),
    // we don't reliably get a final XHR ProgressEvent which reflects the full
    // size of the transferred resource.
    //
    // So, in both of these cases, we fall back to not using ProgressEvents to
    // measure XHR sizes.

    if (firefox_version/* ffVersion */.I && (firefox_version/* ffVersion */.I > 34 || firefox_version/* ffVersion */.I < 10)) return;
    xhr.addEventListener('progress', function (event) {
      ctx.lastSize = event.loaded;
    }, (0,event_listener_opts/* eventListenerOpts */.m)(false));
  }

  function onOpenXhrStart(args) {
    this.params = {
      method: args[0]
    };
    addUrl(this, args[1]);
    this.metrics = {};
  }

  function onOpenXhrEnd(args, xhr) {
    var loader_config = (0,state_loader_config/* getLoaderConfig */.D)();

    if ('xpid' in loader_config && this.sameOrigin) {
      xhr.setRequestHeader('X-NewRelic-ID', loader_config.xpid);
    }

    var payload = this.dt.generateTracePayload(this.parsedOrigin);

    if (payload) {
      var added = false;

      if (payload.newrelicHeader) {
        xhr.setRequestHeader('newrelic', payload.newrelicHeader);
        added = true;
      }

      if (payload.traceContextParentHeader) {
        xhr.setRequestHeader('traceparent', payload.traceContextParentHeader);

        if (payload.traceContextStateHeader) {
          xhr.setRequestHeader('tracestate', payload.traceContextStateHeader);
        }

        added = true;
      }

      if (added) {
        this.dt = payload;
      }
    }
  }

  function onSendXhrStart(args, xhr) {
    var metrics = this.metrics;
    var data = args[0];
    var context = this;

    if (metrics && data) {
      var size = dataSize(data);
      if (size) metrics.txSize = size;
    }

    this.startTime = (0,now/* now */.zO)();

    this.listener = function (evt) {
      try {
        if (evt.type === 'abort' && !context.loadCaptureCalled) {
          context.params.aborted = true;
        }

        if (evt.type !== 'load' || context.called === context.totalCbs && (context.onloadCalled || typeof xhr.onload !== 'function')) context.end(xhr);
      } catch (e) {
        try {
          ee.emit('internal-error', [e]);
        } catch (err) {// do nothing
        }
      }
    };

    for (var i = 0; i < handlersLen; i++) {
      xhr.addEventListener(handlers[i], this.listener, (0,event_listener_opts/* eventListenerOpts */.m)(false));
    }
  }

  function onXhrCbTime(time, onload, xhr) {
    this.cbTime += time;
    if (onload) this.onloadCalled = true;else this.called += 1;
    if (this.called === this.totalCbs && (this.onloadCalled || typeof xhr.onload !== 'function')) this.end(xhr);
  }

  function onXhrLoadAdded(cb, useCapture) {
    // Ignore if the same arguments are passed to addEventListener twice
    var idString = '' + id(cb) + !!useCapture;
    if (!this.xhrGuids || this.xhrGuids[idString]) return;
    this.xhrGuids[idString] = true;
    this.totalCbs += 1;
  }

  function onXhrLoadRemoved(cb, useCapture) {
    // Ignore if event listener didn't exist for this xhr object
    var idString = '' + id(cb) + !!useCapture;
    if (!this.xhrGuids || !this.xhrGuids[idString]) return;
    delete this.xhrGuids[idString];
    this.totalCbs -= 1;
  }

  function onXhrResolved() {
    this.endTime = (0,now/* now */.zO)();
  } // Listen for load listeners to be added to xhr objects


  function onAddEventListenerEnd(args, xhr) {
    if (xhr instanceof origXHR && args[0] === 'load') ee.emit('xhr-load-added', [args[1], args[2]], xhr);
  }

  function onRemoveEventListenerEnd(args, xhr) {
    if (xhr instanceof origXHR && args[0] === 'load') ee.emit('xhr-load-removed', [args[1], args[2]], xhr);
  } // Listen for those load listeners to be called.


  function onFnStart(args, xhr, methodName) {
    if (xhr instanceof origXHR) {
      if (methodName === 'onload') this.onload = true;
      if ((args[0] && args[0].type) === 'load' || this.onload) this.xhrCbStart = (0,now/* now */.zO)();
    }
  }

  function onFnEnd(args, xhr) {
    if (this.xhrCbStart) ee.emit('xhr-cb-time', [(0,now/* now */.zO)() - this.xhrCbStart, this.onload, xhr], xhr);
  } // this event only handles DT


  function onFetchBeforeStart(args) {
    var opts = args[1] || {};
    var url; // argument is USVString

    if (typeof args[0] === 'string') {
      url = args[0]; // argument is Request object
    } else if (args[0] && args[0].url) {
      url = args[0].url; // argument is URL object
    } else if (window.URL && args[0] && args[0] instanceof URL) {
      url = args[0].href;
    }

    if (url) {
      this.parsedOrigin = (0,parse_url/* parseUrl */.e)(url);
      this.sameOrigin = this.parsedOrigin.sameOrigin;
    }

    var payload = this.dt.generateTracePayload(this.parsedOrigin);

    if (!payload || !payload.newrelicHeader && !payload.traceContextParentHeader) {
      return;
    }

    if (typeof args[0] === 'string' || window.URL && args[0] && args[0] instanceof URL) {
      var clone = {};

      for (var key in opts) {
        clone[key] = opts[key];
      }

      clone.headers = new Headers(opts.headers || {});

      if (addHeaders(clone.headers, payload)) {
        this.dt = payload;
      }

      if (args.length > 1) {
        args[1] = clone;
      } else {
        args.push(clone);
      }
    } else if (args[0] && args[0].headers) {
      if (addHeaders(args[0].headers, payload)) {
        this.dt = payload;
      }
    }

    function addHeaders(headersObj, payload) {
      var added = false;

      if (payload.newrelicHeader) {
        headersObj.set('newrelic', payload.newrelicHeader);
        added = true;
      }

      if (payload.traceContextParentHeader) {
        headersObj.set('traceparent', payload.traceContextParentHeader);

        if (payload.traceContextStateHeader) {
          headersObj.set('tracestate', payload.traceContextStateHeader);
        }

        added = true;
      }

      return added;
    }
  }

  function onFetchStart(fetchArguments, dtPayload) {
    this.params = {};
    this.metrics = {};
    this.startTime = (0,now/* now */.zO)();
    this.dt = dtPayload;
    if (fetchArguments.length >= 1) this.target = fetchArguments[0];
    if (fetchArguments.length >= 2) this.opts = fetchArguments[1];
    var opts = this.opts || {};
    var target = this.target;
    var url;

    if (typeof target === 'string') {
      url = target;
    } else if (instrument_typeof(target) === 'object' && target instanceof origRequest) {
      url = target.url;
    } else if (window.URL && instrument_typeof(target) === 'object' && target instanceof URL) {
      url = target.href;
    }

    addUrl(this, url);
    var method = ('' + (target && target instanceof origRequest && target.method || opts.method || 'GET')).toUpperCase();
    this.params.method = method;
    this.txSize = dataSize(opts.body) || 0;
  } // we capture failed call as status 0, the actual error is ignored
  // eslint-disable-next-line handle-callback-err


  function onFetchDone(err, res) {
    this.endTime = (0,now/* now */.zO)();

    if (!this.params) {
      this.params = {};
    }

    this.params.status = res ? res.status : 0; // convert rxSize to a number

    var responseSize;

    if (typeof this.rxSize === 'string' && this.rxSize.length > 0) {
      responseSize = +this.rxSize;
    }

    var metrics = {
      txSize: this.txSize,
      rxSize: responseSize,
      duration: (0,now/* now */.zO)() - this.startTime
    };
    handle('xhr', [this.params, metrics, this.startTime, this.endTime, 'fetch'], this);
  } // Create report for XHR request that has finished


  function end(xhr) {
    var params = this.params;
    var metrics = this.metrics;
    if (this.ended) return;
    this.ended = true;

    for (var i = 0; i < handlersLen; i++) {
      xhr.removeEventListener(handlers[i], this.listener, false);
    }

    if (params.aborted) return;
    metrics.duration = (0,now/* now */.zO)() - this.startTime;

    if (!this.loadCaptureCalled && xhr.readyState === 4) {
      captureXhrData(this, xhr);
    } else if (params.status == null) {
      params.status = 0;
    } // Always send cbTime, even if no noticeable time was taken.


    metrics.cbTime = this.cbTime;
    handle('xhr', [params, metrics, this.startTime, this.endTime, 'xhr'], this);
  }

  function addUrl(ctx, url) {
    var parsed = (0,parse_url/* parseUrl */.e)(url);
    var params = ctx.params;
    params.hostname = parsed.hostname;
    params.port = parsed.port;
    params.protocol = parsed.protocol;
    params.host = parsed.hostname + ':' + parsed.port;
    params.pathname = parsed.pathname;
    ctx.parsedOrigin = parsed;
    ctx.sameOrigin = parsed.sameOrigin;
  }

  function captureXhrData(ctx, xhr) {
    ctx.params.status = xhr.status;
    var size = responseSizeFromXhr(xhr, ctx.lastSize);
    if (size) ctx.metrics.rxSize = size;

    if (ctx.sameOrigin) {
      var header = xhr.getResponseHeader('X-NewRelic-App-Data');

      if (header) {
        ctx.params.cat = header.split(', ').pop();
      }
    }

    ctx.loadCaptureCalled = true;
  }
}

/***/ }),

/***/ 5240:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Aggregate": function() { return /* binding */ Aggregate; }
});

;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/js-errors/aggregate/canonical-function-name.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var canonicalFunctionNameRe = /([a-z0-9]+)$/i;
function canonicalFunctionName(orig) {
  if (!orig) return;
  var match = orig.match(canonicalFunctionNameRe);
  if (match) return match[1];
  return;
} // export default canonicalFunctionName
// module.exports = canonicalFunctionName
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/reduce.js
var reduce = __webpack_require__(157);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/js-errors/aggregate/format-stack-trace.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var stripNewlinesRegex = /^\n+|\n+$/g;
var MAX_STACK_TRACE_LENGTH = 65530;
function formatStackTrace(stackLines) {
  return truncateStackLines(stackLines).replace(stripNewlinesRegex, '');
} // module.exports.truncateSize = truncateSize
// takes array of stack lines and returns string with top 50 and buttom 50 lines

function truncateStackLines(stackLines) {
  var stackString;

  if (stackLines.length > 100) {
    var truncatedLines = stackLines.length - 100;
    stackString = stackLines.slice(0, 50).join('\n');
    stackString += '\n< ...truncated ' + truncatedLines + ' lines... >\n';
    stackString += stackLines.slice(-50).join('\n');
  } else {
    stackString = stackLines.join('\n');
  }

  return stackString;
} // truncates stack string to limit what is sent to backend


function truncateSize(stackString) {
  return stackString.length > MAX_STACK_TRACE_LENGTH ? stackString.substr(0, MAX_STACK_TRACE_LENGTH) : stackString;
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/js-errors/aggregate/compute-stack-trace.js
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


var debug = false;
var classNameRegex = /function (.+?)\s*\(/;
var chrome = /^\s*at (?:((?:\[object object\])?(?:[^(]*\([^)]*\))*[^()]*(?: \[as \S+\])?) )?\(?((?:file|http|https|chrome-extension):.*?)?:(\d+)(?::(\d+))?\)?\s*$/i;
var gecko = /^\s*(?:(\S*|global code)(?:\(.*?\))?@)?((?:file|http|https|chrome|safari-extension).*?):(\d+)(?::(\d+))?\s*$/i;
var chrome_eval = /^\s*at .+ \(eval at \S+ \((?:(?:file|http|https):[^)]+)?\)(?:, [^:]*:\d+:\d+)?\)$/i;
var ie_eval = /^\s*at Function code \(Function code:\d+:\d+\)\s*/i; // export default computeStackTrace
// module.exports = computeStackTrace

function computeStackTrace(ex) {
  var stack = null;

  try {
    stack = computeStackTraceFromStackProp(ex);

    if (stack) {
      return stack;
    }
  } catch (e) {
    if (debug) {
      throw e;
    }
  }

  try {
    stack = computeStackTraceBySourceAndLine(ex);

    if (stack) {
      return stack;
    }
  } catch (e) {
    if (debug) {
      throw e;
    }
  }

  try {
    stack = computeStackTraceWithMessageOnly(ex);

    if (stack) {
      return stack;
    }
  } catch (e) {
    if (debug) {
      throw e;
    }
  }

  return {
    'mode': 'failed',
    'stackString': '',
    'frames': []
  };
}
/**
 * Computes stack trace information from the stack property.
 * Chrome and Gecko use this property.
 * @param {Error} ex
 * @return {?Object.<string, *>} Stack trace information.
 */

function computeStackTraceFromStackProp(ex) {
  if (!ex.stack) {
    return null;
  }

  var errorInfo = (0,reduce/* reduce */.u)(ex.stack.split('\n'), parseStackProp, {
    frames: [],
    stackLines: [],
    wrapperSeen: false
  });
  if (!errorInfo.frames.length) return null;
  return {
    'mode': 'stack',
    'name': ex.name || getClassName(ex),
    'message': ex.message,
    'stackString': formatStackTrace(errorInfo.stackLines),
    'frames': errorInfo.frames
  };
}

function parseStackProp(info, line) {
  var element = getElement(line);

  if (!element) {
    info.stackLines.push(line);
    return info;
  }

  if (isWrapper(element.func)) info.wrapperSeen = true;else info.stackLines.push(line);
  if (!info.wrapperSeen) info.frames.push(element);
  return info;
}

function getElement(line) {
  var parts = line.match(gecko);
  if (!parts) parts = line.match(chrome);

  if (parts) {
    return {
      'url': parts[2],
      'func': parts[1] !== 'Anonymous function' && parts[1] !== 'global code' && parts[1] || null,
      'line': +parts[3],
      'column': parts[4] ? +parts[4] : null
    };
  }

  if (line.match(chrome_eval) || line.match(ie_eval) || line === 'anonymous') {
    return {
      'func': 'evaluated code'
    };
  }
}

function computeStackTraceBySourceAndLine(ex) {
  if (!('line' in ex)) return null;
  var className = ex.name || getClassName(ex); // Safari does not provide a URL for errors in eval'd code

  if (!ex.sourceURL) {
    return {
      'mode': 'sourceline',
      'name': className,
      'message': ex.message,
      'stackString': getClassName(ex) + ': ' + ex.message + '\n    in evaluated code',
      'frames': [{
        'func': 'evaluated code'
      }]
    };
  }

  var stackString = className + ': ' + ex.message + '\n    at ' + ex.sourceURL;

  if (ex.line) {
    stackString += ':' + ex.line;

    if (ex.column) {
      stackString += ':' + ex.column;
    }
  }

  return {
    'mode': 'sourceline',
    'name': className,
    'message': ex.message,
    'stackString': stackString,
    'frames': [{
      'url': ex.sourceURL,
      'line': ex.line,
      'column': ex.column
    }]
  };
}

function computeStackTraceWithMessageOnly(ex) {
  var className = ex.name || getClassName(ex);
  if (!className) return null;
  return {
    'mode': 'nameonly',
    'name': className,
    'message': ex.message,
    'stackString': className + ': ' + ex.message,
    'frames': []
  };
}

function getClassName(obj) {
  var results = classNameRegex.exec(String(obj.constructor));
  return results && results.length > 1 ? results[1] : 'unknown';
}

function isWrapper(functionName) {
  return functionName && functionName.indexOf('nrWrapper') >= 0;
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/js-errors/aggregate/string-hash-code.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
function stringHashCode(string) {
  var hash = 0;
  var charVal;
  if (!string || !string.length) return hash;

  for (var i = 0; i < string.length; i++) {
    charVal = string.charCodeAt(i);
    hash = (hash << 5) - hash + charVal;
    hash = hash | 0; // Convert to 32bit integer
  }

  return hash;
} // export default stringHashCode
// module.exports = stringHashCode
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-emitter/register-handler.js
var register_handler = __webpack_require__(8244);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/harvest/harvest-scheduler.js + 1 modules
var harvest_scheduler = __webpack_require__(6898);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/stringify.js
var stringify = __webpack_require__(902);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-emitter/handle.js
var handle = __webpack_require__(8668);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/map-own.js
var map_own = __webpack_require__(1599);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/init.js
var init = __webpack_require__(1311);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/runtime.js + 1 modules
var runtime = __webpack_require__(2469);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/info.js
var info = __webpack_require__(1525);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/timing/now.js
var now = __webpack_require__(9433);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/url/clean-url.js
var clean_url = __webpack_require__(8413);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/feature-base.js
var feature_base = __webpack_require__(9077);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/js-errors/aggregate/index.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */













var Aggregate = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Aggregate, _FeatureBase);

  var _super = _createSuper(Aggregate);

  function Aggregate(agentIdentifier, aggregator) {
    var _this;

    _classCallCheck(this, Aggregate);

    _this = _super.call(this, agentIdentifier, aggregator);
    _this.stackReported = {};
    _this.pageviewReported = {};
    _this.errorCache = {};
    _this.currentBody;
    _this.errorOnPage = false; // this will need to change to match whatever ee we use in the instrument

    _this.ee.on('interactionSaved', function (interaction) {
      if (!this.errorCache[interaction.id]) return;
      this.errorCache[interaction.id].forEach(function (item) {
        var customParams = {};
        var globalCustomParams = item[4];
        var localCustomParams = item[5];
        (0,map_own/* mapOwn */.D)(globalCustomParams, setCustom);
        (0,map_own/* mapOwn */.D)(interaction.root.attrs.custom, setCustom);
        (0,map_own/* mapOwn */.D)(localCustomParams, setCustom);
        var params = item[2];
        params.browserInteractionId = interaction.root.attrs.id;
        delete params._interactionId;

        if (params._interactionNodeId) {
          params.parentNodeId = params._interactionNodeId.toString();
          delete params._interactionNodeId;
        }

        var hash = item[1] + interaction.root.attrs.id;
        var jsAttributesHash = stringHashCode((0,stringify/* stringify */.P)(customParams));
        var aggregateHash = hash + ':' + jsAttributesHash;
        this.aggregator.store(item[0], aggregateHash, params, item[3], customParams);

        function setCustom(key, val) {
          customParams[key] = val && _typeof(val) === 'object' ? (0,stringify/* stringify */.P)(val) : val;
        }
      });
      delete this.errorCache[interaction.id];
    }); // this will need to change to match whatever ee we use in the instrument


    _this.ee.on('interactionDiscarded', function (interaction) {
      if (!this.errorCache || !this.errorCache[interaction.id]) return;
      this.errorCache[interaction.id].forEach(function (item) {
        var customParams = {};
        var globalCustomParams = item[4];
        var localCustomParams = item[5];
        (0,map_own/* mapOwn */.D)(globalCustomParams, setCustom);
        (0,map_own/* mapOwn */.D)(interaction.root.attrs.custom, setCustom);
        (0,map_own/* mapOwn */.D)(localCustomParams, setCustom);
        var params = item[2];
        delete params._interactionId;
        delete params._interactionNodeId;
        var hash = item[1];
        var jsAttributesHash = stringHashCode((0,stringify/* stringify */.P)(customParams));
        var aggregateHash = hash + ':' + jsAttributesHash;
        this.aggregator.store(item[0], aggregateHash, item[2], item[3], customParams);

        function setCustom(key, val) {
          customParams[key] = val && _typeof(val) === 'object' ? (0,stringify/* stringify */.P)(val) : val;
        }
      });
      delete this.errorCache[interaction.id];
    });

    (0,register_handler/* registerHandler */.XN)('err', function () {
      var _this2;

      return (_this2 = _this).storeError.apply(_this2, arguments);
    }, undefined, _this.ee);
    (0,register_handler/* registerHandler */.XN)('ierr', function () {
      var _this3;

      return (_this3 = _this).storeError.apply(_this3, arguments);
    }, undefined, _this.ee);
    var harvestTimeSeconds = (0,init/* getConfigurationValue */.Mt)(_this.agentIdentifier, 'jserrors.harvestTimeSeconds') || 10; // on('jserrors', this.onHarvestStarted) //harvest.js --> now a class()

    var scheduler = new harvest_scheduler/* HarvestScheduler */.o('jserrors', {
      onFinished: function onFinished() {
        var _this4;

        return (_this4 = _this).onHarvestFinished.apply(_this4, arguments);
      }
    }, _assertThisInitialized(_this));
    scheduler.harvest.on('jserrors', function () {
      var _this5;

      return (_this5 = _this).onHarvestStarted.apply(_this5, arguments);
    });
    scheduler.startTimer(harvestTimeSeconds);
    return _this;
  }

  _createClass(Aggregate, [{
    key: "onHarvestStarted",
    value: function onHarvestStarted(options) {
      var body = this.aggregator.take(['err', 'ierr']);

      if (options.retry) {
        this.currentBody = body;
      }

      var payload = {
        body: body,
        qs: {}
      };
      var releaseIds = (0,stringify/* stringify */.P)((0,runtime/* getRuntime */.O)(this.agentIdentifier).releaseIds);

      if (releaseIds !== '{}') {
        payload.qs.ri = releaseIds;
      }

      if (body && body.err && body.err.length && !this.errorOnPage) {
        payload.qs.pve = '1';
        this.errorOnPage = true;
      }

      return payload;
    }
  }, {
    key: "onHarvestFinished",
    value: function onHarvestFinished(result) {
      if (result.retry && this.currentBody) {
        (0,map_own/* mapOwn */.D)(this.currentBody, function (key, value) {
          for (var i = 0; i < value.length; i++) {
            var bucket = value[i];
            var name = this.getBucketName(bucket.params, bucket.custom);
            this.aggregator.merge(key, name, bucket.metrics, bucket.params, bucket.custom);
          }
        });
        this.currentBody = null;
      }
    }
  }, {
    key: "nameHash",
    value: function nameHash(params) {
      return stringHashCode(params.exceptionClass) ^ params.stackHash;
    }
  }, {
    key: "getBucketName",
    value: function getBucketName(params, customParams) {
      return this.nameHash(params) + ':' + stringHashCode((0,stringify/* stringify */.P)(customParams));
    }
  }, {
    key: "canonicalizeURL",
    value: function canonicalizeURL(url, cleanedOrigin) {
      if (typeof url !== 'string') return '';
      var cleanedURL = (0,clean_url/* cleanURL */.f)(url);

      if (cleanedURL === cleanedOrigin) {
        return '<inline>';
      } else {
        return cleanedURL;
      }
    }
  }, {
    key: "buildCanonicalStackString",
    value: function buildCanonicalStackString(stackInfo, cleanedOrigin) {
      var canonicalStack = '';

      for (var i = 0; i < stackInfo.frames.length; i++) {
        var frame = stackInfo.frames[i];
        var func = canonicalFunctionName(frame.func);
        if (canonicalStack) canonicalStack += '\n';
        if (func) canonicalStack += func + '@';
        if (typeof frame.url === 'string') canonicalStack += frame.url;
        if (frame.line) canonicalStack += ':' + frame.line;
      }

      return canonicalStack;
    } // Strip query parameters and fragments from the stackString property of the
    // given stackInfo, along with the 'url' properties of each frame in
    // stackInfo.frames.
    //
    // Any URLs that are equivalent to the cleaned version of the origin will also
    // be replaced with the string '<inline>'.
    //

  }, {
    key: "canonicalizeStackURLs",
    value: function canonicalizeStackURLs(stackInfo) {
      // Currently, loader.origin might contain a fragment, but we don't want to use it
      // for comparing with frame URLs.
      var cleanedOrigin = (0,clean_url/* cleanURL */.f)((0,runtime/* getRuntime */.O)(this.agentIdentifier).origin);

      for (var i = 0; i < stackInfo.frames.length; i++) {
        var frame = stackInfo.frames[i];
        var originalURL = frame.url;
        var cleanedURL = this.canonicalizeURL(originalURL, cleanedOrigin);

        if (cleanedURL && cleanedURL !== frame.url) {
          frame.url = cleanedURL;
          stackInfo.stackString = stackInfo.stackString.split(originalURL).join(cleanedURL);
        }
      }

      return stackInfo;
    }
  }, {
    key: "storeError",
    value: function storeError(err, time, internal, customAttributes) {
      // are we in an interaction
      time = time || (0,now/* now */.zO)();
      if (!internal && (0,runtime/* getRuntime */.O)(this.agentIdentifier).onerror && (0,runtime/* getRuntime */.O)(this.agentIdentifier).onerror(err)) return;
      var stackInfo = this.canonicalizeStackURLs(computeStackTrace(err));
      var canonicalStack = this.buildCanonicalStackString(stackInfo);
      var params = {
        stackHash: stringHashCode(canonicalStack),
        exceptionClass: stackInfo.name,
        request_uri: window.location.pathname
      };

      if (stackInfo.message) {
        params.message = '' + stackInfo.message;
      }

      if (!this.stackReported[params.stackHash]) {
        this.stackReported[params.stackHash] = true;
        params.stack_trace = truncateSize(stackInfo.stackString);
      } else {
        params.browser_stack_hash = stringHashCode(stackInfo.stackString);
      }

      params.releaseIds = (0,stringify/* stringify */.P)((0,runtime/* getRuntime */.O)(this.agentIdentifier).releaseIds); // When debugging stack canonicalization/hashing, uncomment these lines for
      // more output in the test logs
      // params.origStack = err.stack
      // params.canonicalStack = canonicalStack

      var hash = this.nameHash(params);

      if (!this.pageviewReported[hash]) {
        params.pageview = 1;
        this.pageviewReported[hash] = true;
      }

      var type = internal ? 'ierr' : 'err';
      var newMetrics = {
        time: time
      }; // stn and spa aggregators listen to this event - stn sends the error in its payload,
      // and spa annotates the error with interaction info

      (0,handle/* handle */.pr)('errorAgg', [type, hash, params, newMetrics], undefined, undefined, this.ee);

      if (params._interactionId != null) {
        // hold on to the error until the interaction finishes
        this.errorCache[params._interactionId] = this.errorCache[params._interactionId] || [];

        this.errorCache[params._interactionId].push([type, hash, params, newMetrics, att, customAttributes]);
      } else {
        // store custom attributes
        var customParams = {};
        var att = (0,info/* getInfo */.C)(this.agentIdentifier).jsAttributes;
        (0,map_own/* mapOwn */.D)(att, setCustom);

        if (customAttributes) {
          (0,map_own/* mapOwn */.D)(customAttributes, setCustom);
        }

        var jsAttributesHash = stringHashCode((0,stringify/* stringify */.P)(customParams));
        var aggregateHash = hash + ':' + jsAttributesHash;
        this.aggregator.store(type, aggregateHash, params, newMetrics, customParams);
      }

      function setCustom(key, val) {
        customParams[key] = val && _typeof(val) === 'object' ? (0,stringify/* stringify */.P)(val) : val;
      }
    }
  }]);

  return Aggregate;
}(feature_base/* FeatureBase */.W);

/***/ }),

/***/ 7415:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Instrument": function() { return /* binding */ Instrument; }
/* harmony export */ });
/* harmony import */ var _common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(8668);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2469);
/* harmony import */ var _common_timing_now__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(9433);
/* harmony import */ var _common_util_get_or_set__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1403);
/* harmony import */ var _common_wrap__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(7423);
/* harmony import */ var lodash_slice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1990);
/* harmony import */ var lodash_slice__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash_slice__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _common_util_feature_base__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(9077);
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */








var origOnerror = window.onerror;
var handleErrors = false;
var NR_ERR_PROP = 'nr@seenError'; // skipNext counter to keep track of uncaught
// errors that will be the same as caught errors.
// var skipNext = 0

var Instrument = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Instrument, _FeatureBase);

  var _super = _createSuper(Instrument);

  function Instrument(agentIdentifier) {
    var _this;

    _classCallCheck(this, Instrument);

    _this = _super.call(this, agentIdentifier); // skipNext counter to keep track of uncaught
    // errors that will be the same as caught errors.

    _this.skipNext = 0;

    var self = _assertThisInitialized(_this);

    _this.ee.on('fn-start', function (args, obj, methodName) {
      if (handleErrors) {
        this.skipNext = this.skipNext ? this.skipNext + 1 : 1;
      }
    });

    _this.ee.on('fn-err', function (args, obj, err) {
      if (handleErrors && !err[NR_ERR_PROP]) {
        (0,_common_util_get_or_set__WEBPACK_IMPORTED_MODULE_1__/* .getOrSet */ .X)(err, NR_ERR_PROP, function getVal() {
          return true;
        });
        this.thrown = true;
        notice(err, undefined, self.ee);
      }
    });

    _this.ee.on('fn-end', function () {
      if (!handleErrors) return;
      if (!this.thrown && this.skipNext > 0) this.skipNext -= 1;
    });

    _this.ee.on('internal-error', function (e) {
      (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_2__/* .handle */ .pr)('ierr', [e, (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)(), true], undefined, undefined, _this.ee);
    }); // Declare that we are using err instrumentation
    // require('./debug')


    var prevOnError = window.onerror;

    window.onerror = function () {
      var _this2;

      if (prevOnError) prevOnError.apply(void 0, arguments);

      (_this2 = _this).onerrorHandler.apply(_this2, arguments);

      return false;
    };

    try {
      window.addEventListener('unhandledrejection', function (e) {
        _this.onerrorHandler(null, null, null, null, new Error(e.reason));
      });
    } catch (err) {// do nothing -- addEventListener is not supported
    }

    try {
      throw new Error();
    } catch (e) {
      // Only wrap stuff if try/catch gives us useful data. It doesn't in IE < 10.
      if ('stack' in e) {
        (0,_common_wrap__WEBPACK_IMPORTED_MODULE_4__/* .wrapTimer */ .BV)(_this.ee);
        (0,_common_wrap__WEBPACK_IMPORTED_MODULE_4__/* .wrapRaf */ .gy)(_this.ee);

        if ('addEventListener' in window) {
          (0,_common_wrap__WEBPACK_IMPORTED_MODULE_4__/* .wrapEvents */ .em)(_this.ee);
        }

        if ((0,_common_config_config__WEBPACK_IMPORTED_MODULE_5__/* .getRuntime */ .O)(_this.agentIdentifier).xhrWrappable) {
          (0,_common_wrap__WEBPACK_IMPORTED_MODULE_4__/* .wrapXhr */ .Kf)(_this.ee);
        }

        handleErrors = true;
      }
    }

    return _this;
  } // FF and Android browsers do not provide error info to the 'error' event callback,
  // so we must use window.onerror


  _createClass(Instrument, [{
    key: "onerrorHandler",
    value: function onerrorHandler(message, filename, lineno, column, errorObj) {
      try {
        if (this.skipNext) this.skipNext -= 1;else notice(errorObj || new UncaughtException(message, filename, lineno), true, this.ee);
      } catch (e) {
        try {
          (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_2__/* .handle */ .pr)('ierr', [e, (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)(), true], undefined, undefined, this.ee);
        } catch (err) {// do nothing
        }
      }

      if (typeof origOnerror === 'function') return origOnerror.apply(this, lodash_slice__WEBPACK_IMPORTED_MODULE_0___default()(arguments));
      return false;
    }
  }]);

  return Instrument;
}(_common_util_feature_base__WEBPACK_IMPORTED_MODULE_6__/* .FeatureBase */ .W);

function UncaughtException(message, filename, lineno) {
  this.message = message || 'Uncaught error with no additional information';
  this.sourceURL = filename;
  this.line = lineno;
} // emits 'handle > error' event, which the error aggregator listens on


function notice(err, doNotStamp, ee) {
  // by default add timestamp, unless specifically told not to
  // this is to preserve existing behavior
  var time = !doNotStamp ? (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)() : null;
  (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_2__/* .handle */ .pr)('err', [err, time], undefined, undefined, ee);
}

/***/ }),

/***/ 6063:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Aggregate": function() { return /* binding */ Aggregate; }
/* harmony export */ });
/* harmony import */ var _common_util_map_own__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(1599);
/* harmony import */ var _common_util_stringify__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(902);
/* harmony import */ var _common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8244);
/* harmony import */ var _common_harvest_harvest_scheduler__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(6898);
/* harmony import */ var _common_url_clean_url__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(8413);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1311);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1525);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2469);
/* harmony import */ var _common_util_feature_base__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(9077);
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


 // import { on as onHarvest } from '../../../common/harvest/harvest'





var Aggregate = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Aggregate, _FeatureBase);

  var _super = _createSuper(Aggregate);

  function Aggregate(agentIdentifier, aggregator) {
    var _this;

    _classCallCheck(this, Aggregate);

    _this = _super.call(this, agentIdentifier, aggregator);
    _this.eventsPerMinute = 240;
    _this.harvestTimeSeconds = (0,_common_config_config__WEBPACK_IMPORTED_MODULE_0__/* .getConfigurationValue */ .Mt)('ins.harvestTimeSeconds') || 30;
    _this.eventsPerHarvest = _this.eventsPerMinute * _this.harvestTimeSeconds / 60;
    _this.referrerUrl;
    _this.currentEvents;
    _this.events = [];
    _this.att = {};
    (0,_common_config_config__WEBPACK_IMPORTED_MODULE_1__/* .setInfo */ .L)(_this.agentIdentifier, {
      jsAttributes: _this.att
    });
    if (document.referrer) _this.referrerUrl = (0,_common_url_clean_url__WEBPACK_IMPORTED_MODULE_2__/* .cleanURL */ .f)(document.referrer);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_3__/* .registerHandler */ .XN)('api-setCustomAttribute', function () {
      var _this2;

      return (_this2 = _this).setCustomAttribute.apply(_this2, arguments);
    }, 'api', _this.ee);

    _this.ee.on('feat-ins', function () {
      var _this3 = this;

      (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_3__/* .registerHandler */ .XN)('api-addPageAction', function () {
        return _this3.addPageAction.apply(_this3, arguments);
      }, undefined, this.ee);
      var scheduler = new _common_harvest_harvest_scheduler__WEBPACK_IMPORTED_MODULE_4__/* .HarvestScheduler */ .o('ins', {
        onFinished: function onFinished() {
          return _this3.onHarvestFinished.apply(_this3, arguments);
        }
      }, this);
      scheduler.harvest.on('ins', function () {
        return _this3.onHarvestStarted.apply(_this3, arguments);
      });
      scheduler.startTimer(this.harvestTimeSeconds, 0);
    });

    return _this;
  }

  _createClass(Aggregate, [{
    key: "onHarvestStarted",
    value: function onHarvestStarted(options) {
      var _getInfo = (0,_common_config_config__WEBPACK_IMPORTED_MODULE_1__/* .getInfo */ .C)(this.agentIdentifier),
          userAttributes = _getInfo.userAttributes,
          atts = _getInfo.atts;

      var payload = {
        qs: {
          ua: userAttributes,
          at: atts
        },
        body: {
          ins: this.events
        }
      };

      if (options.retry) {
        this.currentEvents = this.events;
      }

      this.events = [];
      return payload;
    }
  }, {
    key: "onHarvestFinished",
    value: function onHarvestFinished(result) {
      if (result && result.sent && result.retry && this.currentEvents) {
        this.events = this.events.concat(this.currentEvents);
        this.currentEvents = null;
      }
    } // WARNING: Insights times are in seconds. EXCEPT timestamp, which is in ms.

  }, {
    key: "addPageAction",
    value: function addPageAction(t, name, attributes) {
      if (this.events.length >= this.eventsPerHarvest) return;
      var width;
      var height;
      var eventAttributes = {};

      if (typeof window !== 'undefined' && window.document && window.document.documentElement) {
        // Doesn't include the nav bar when it disappears in mobile safari
        // https://github.com/jquery/jquery/blob/10399ddcf8a239acc27bdec9231b996b178224d3/src/dimensions.js#L23
        width = window.document.documentElement.clientWidth;
        height = window.document.documentElement.clientHeight;
      }

      var defaults = {
        timestamp: t + (0,_common_config_config__WEBPACK_IMPORTED_MODULE_5__/* .getRuntime */ .O)(this.agentIdentifier).offset,
        timeSinceLoad: t / 1000,
        browserWidth: width,
        browserHeight: height,
        referrerUrl: this.referrerUrl,
        currentUrl: (0,_common_url_clean_url__WEBPACK_IMPORTED_MODULE_2__/* .cleanURL */ .f)('' + location),
        pageUrl: (0,_common_url_clean_url__WEBPACK_IMPORTED_MODULE_2__/* .cleanURL */ .f)((0,_common_config_config__WEBPACK_IMPORTED_MODULE_5__/* .getRuntime */ .O)(this.agentIdentifier).origin),
        eventType: 'PageAction'
      };
      (0,_common_util_map_own__WEBPACK_IMPORTED_MODULE_6__/* .mapOwn */ .D)(defaults, set);
      (0,_common_util_map_own__WEBPACK_IMPORTED_MODULE_6__/* .mapOwn */ .D)(this.att, set);

      if (attributes && _typeof(attributes) === 'object') {
        (0,_common_util_map_own__WEBPACK_IMPORTED_MODULE_6__/* .mapOwn */ .D)(attributes, set);
      }

      eventAttributes.actionName = name || '';
      this.events.push(eventAttributes);

      function set(key, val) {
        eventAttributes[key] = val && _typeof(val) === 'object' ? (0,_common_util_stringify__WEBPACK_IMPORTED_MODULE_7__/* .stringify */ .P)(val) : val;
      }
    }
  }, {
    key: "setCustomAttribute",
    value: function setCustomAttribute(t, key, value) {
      this.att[key] = value;
    }
  }]);

  return Aggregate;
}(_common_util_feature_base__WEBPACK_IMPORTED_MODULE_8__/* .FeatureBase */ .W);

/***/ }),

/***/ 5877:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Instrument": function() { return /* binding */ Instrument; }
/* harmony export */ });
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2469);
/* harmony import */ var _common_util_feature_base__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9077);
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// Turn on feature


var Instrument = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Instrument, _FeatureBase);

  var _super = _createSuper(Instrument);

  function Instrument(agentIdentifier) {
    var _this;

    _classCallCheck(this, Instrument);

    _this = _super.call(this, agentIdentifier);
    if (!(0,_common_config_config__WEBPACK_IMPORTED_MODULE_0__/* .getRuntime */ .O)(_this.agentIdentifier).disabled) (0,_common_config_config__WEBPACK_IMPORTED_MODULE_0__/* .getRuntime */ .O)(_this.agentIdentifier).features.ins = true;
    return _this;
  }

  return _createClass(Instrument);
}(_common_util_feature_base__WEBPACK_IMPORTED_MODULE_1__/* .FeatureBase */ .W);

/***/ }),

/***/ 578:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Aggregate": function() { return /* binding */ Aggregate; }
});

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/timing/stopwatch.js
var stopwatch = __webpack_require__(9387);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/map-own.js
var map_own = __webpack_require__(1599);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/url/encode.js
var encode = __webpack_require__(7187);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/timing/nav-timing.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// We don't use JSON.stringify directly on the performance timing data for these reasons:
// * Chrome has extra data in the performance object that we don't want to send all the time (wasteful)
// * Firefox fails to stringify the native object due to - http://code.google.com/p/v8/issues/detail?id=1223
// * The variable names are long and wasteful to transmit
// Add Performance Timing values to the given object.
// * Values are written relative to an offset to reduce their length (i.e. number of characters).
// * The offset is sent with the data
// * 0's are not included unless the value is a 'relative zero'
//
var START = 'Start';
var END = 'End';
var UNLOAD_EVENT = 'unloadEvent';
var REDIRECT = 'redirect';
var DOMAIN_LOOKUP = 'domainLookup';
var ONNECT = 'onnect';
var REQUEST = 'request';
var RESPONSE = 'response';
var LOAD_EVENT = 'loadEvent';
var DOM_CONTENT_LOAD_EVENT = 'domContentLoadedEvent';
var navTimingValues = []; // module.exports = {
//   addPT: addPT,
//   addPN: addPN,
//   nt: navTimingValues
// }

function addPT(pt, v) {
  var offset = pt['navigation' + START];
  v.of = offset;
  addRel(offset, offset, v, 'n');
  addRel(pt[UNLOAD_EVENT + START], offset, v, 'u');
  addRel(pt[REDIRECT + START], offset, v, 'r');
  addRel(pt[UNLOAD_EVENT + END], offset, v, 'ue');
  addRel(pt[REDIRECT + END], offset, v, 're');
  addRel(pt['fetch' + START], offset, v, 'f');
  addRel(pt[DOMAIN_LOOKUP + START], offset, v, 'dn');
  addRel(pt[DOMAIN_LOOKUP + END], offset, v, 'dne');
  addRel(pt['c' + ONNECT + START], offset, v, 'c');
  addRel(pt['secureC' + ONNECT + 'ion' + START], offset, v, 's');
  addRel(pt['c' + ONNECT + END], offset, v, 'ce');
  addRel(pt[REQUEST + START], offset, v, 'rq');
  addRel(pt[RESPONSE + START], offset, v, 'rp');
  addRel(pt[RESPONSE + END], offset, v, 'rpe');
  addRel(pt.domLoading, offset, v, 'dl');
  addRel(pt.domInteractive, offset, v, 'di');
  addRel(pt[DOM_CONTENT_LOAD_EVENT + START], offset, v, 'ds');
  addRel(pt[DOM_CONTENT_LOAD_EVENT + END], offset, v, 'de');
  addRel(pt.domComplete, offset, v, 'dc');
  addRel(pt[LOAD_EVENT + START], offset, v, 'l');
  addRel(pt[LOAD_EVENT + END], offset, v, 'le');
  return v;
} // Add Performance Navigation values to the given object

function addPN(pn, v) {
  addRel(pn.type, 0, v, 'ty');
  addRel(pn.redirectCount, 0, v, 'rc');
  return v;
}
function addRel(value, offset, obj, prop) {
  var relativeValue;

  if (typeof value === 'number' && value > 0) {
    relativeValue = Math.round(value - offset);
    obj[prop] = relativeValue;
  }

  navTimingValues.push(relativeValue);
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/stringify.js
var stringify = __webpack_require__(902);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/metrics/paint-metrics.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var paintMetrics = {}; // module.exports = {
//   addMetric: addMetric,
//   metrics: paintMetrics
// }

function addMetric(name, value) {
  paintMetrics[name] = value;
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/submit-data.js
var submit_data = __webpack_require__(533);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/init.js
var init = __webpack_require__(1311);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/info.js
var state_info = __webpack_require__(1525);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/runtime.js + 1 modules
var runtime = __webpack_require__(2469);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/harvest/harvest-scheduler.js + 1 modules
var harvest_scheduler = __webpack_require__(6898);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/feature-base.js
var feature_base = __webpack_require__(9077);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/page-view-event/aggregate/index.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }











var jsonp = 'NREUM.setToken';
var Aggregate = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Aggregate, _FeatureBase);

  var _super = _createSuper(Aggregate);

  function Aggregate(agentIdentifier, aggregator) {
    var _this;

    _classCallCheck(this, Aggregate);

    _this = _super.call(this, agentIdentifier, aggregator);

    _this.getScheme = function () {
      return (0,init/* getConfigurationValue */.Mt)(_this.agentIdentifier, 'ssl') === false ? 'http' : 'https';
    };

    var info = (0,state_info/* getInfo */.C)(_this.agentIdentifier);
    if (!info.beacon) return _possibleConstructorReturn(_this);
    if (info.queueTime) _this.aggregator.store('measures', 'qt', {
      value: info.queueTime
    });
    if (info.applicationTime) _this.aggregator.store('measures', 'ap', {
      value: info.applicationTime
    }); // some time in the past some code will have called stopwatch.mark('starttime', Date.now())
    // calling measure like this will create a metric that measures the time differential between
    // the two marks.

    (0,stopwatch/* measure */.L)(_this.aggregator, 'be', 'starttime', 'firstbyte');
    (0,stopwatch/* measure */.L)(_this.aggregator, 'fe', 'firstbyte', 'onload');
    (0,stopwatch/* measure */.L)(_this.aggregator, 'dc', 'firstbyte', 'domContent');

    var measuresMetrics = _this.aggregator.get('measures');

    var measuresQueryString = (0,map_own/* mapOwn */.D)(measuresMetrics, function (metricName, measure) {
      return '&' + metricName + '=' + measure.params.value;
    }).join(''); // if (measuresQueryString) {
    // currently we only have one version of our protocol
    // in the future we may add more

    var protocol = '1';
    var scheduler = new harvest_scheduler/* HarvestScheduler */.o('page-view-event', {}, _assertThisInitialized(_this));
    var chunksForQueryString = [scheduler.harvest.baseQueryString()];
    chunksForQueryString.push(measuresQueryString);
    chunksForQueryString.push((0,encode/* param */.wu)('tt', info.ttGuid));
    chunksForQueryString.push((0,encode/* param */.wu)('us', info.user));
    chunksForQueryString.push((0,encode/* param */.wu)('ac', info.account));
    chunksForQueryString.push((0,encode/* param */.wu)('pr', info.product));
    chunksForQueryString.push((0,encode/* param */.wu)('af', (0,map_own/* mapOwn */.D)((0,runtime/* getRuntime */.O)(_this.agentIdentifier).features, function (k) {
      return k;
    }).join(',')));

    if (window.performance && typeof window.performance.timing !== 'undefined') {
      var navTimingApiData = {
        timing: addPT(window.performance.timing, {}),
        navigation: addPN(window.performance.navigation, {})
      };
      chunksForQueryString.push((0,encode/* param */.wu)('perf', (0,stringify/* stringify */.P)(navTimingApiData)));
    }

    if (window.performance && window.performance.getEntriesByType) {
      var entries = window.performance.getEntriesByType('paint');

      if (entries && entries.length > 0) {
        entries.forEach(function (entry) {
          if (!entry.startTime || entry.startTime <= 0) return;

          if (entry.name === 'first-paint') {
            chunksForQueryString.push((0,encode/* param */.wu)('fp', String(Math.floor(entry.startTime))));
          } else if (entry.name === 'first-contentful-paint') {
            chunksForQueryString.push((0,encode/* param */.wu)('fcp', String(Math.floor(entry.startTime))));
          }

          addMetric(entry.name, Math.floor(entry.startTime));
        });
      }
    }

    chunksForQueryString.push((0,encode/* param */.wu)('xx', info.extra));
    chunksForQueryString.push((0,encode/* param */.wu)('ua', info.userAttributes));
    chunksForQueryString.push((0,encode/* param */.wu)('at', info.atts));
    var customJsAttributes = (0,stringify/* stringify */.P)(info.jsAttributes);
    chunksForQueryString.push((0,encode/* param */.wu)('ja', customJsAttributes === '{}' ? null : customJsAttributes));
    var queryString = (0,encode/* fromArray */.nI)(chunksForQueryString, (0,runtime/* getRuntime */.O)(_this.agentIdentifier).maxBytes);
    submit_data/* submitData.jsonp */.T.jsonp(_this.getScheme() + '://' + info.beacon + '/' + protocol + '/' + info.licenseKey + queryString, jsonp);
    return _this;
  }

  return _createClass(Aggregate);
}(feature_base/* FeatureBase */.W);

/***/ }),

/***/ 1200:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Instrument": function() { return /* binding */ Instrument; }
});

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-emitter/handle.js
var handle = __webpack_require__(8668);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/timing/now.js
var now = __webpack_require__(9433);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/feature-base.js
var feature_base = __webpack_require__(9077);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-listener/event-listener-opts.js
var event_listener_opts = __webpack_require__(3207);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/window/load.js

var win = window;
var doc = win.document;
var ADD_EVENT_LISTENER = 'addEventListener';
var ATTACH_EVENT = 'attachEvent';

function stateChange(cb) {
  if (doc.readyState === 'complete') cb();
}

function onWindowLoad(cb) {
  if (doc[ADD_EVENT_LISTENER]) win[ADD_EVENT_LISTENER]('load', cb, (0,event_listener_opts/* eventListenerOpts */.m)(false));else win[ATTACH_EVENT]('onload', cb);
}
function onDOMContentLoaded(cb) {
  if (doc[ADD_EVENT_LISTENER]) doc[ADD_EVENT_LISTENER]('DOMContentLoaded', cb, (0,event_listener_opts/* eventListenerOpts */.m)(false));else doc[ATTACH_EVENT]('onreadystatechange', stateChange);
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/page-view-event/instrument/index.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }





var Instrument = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Instrument, _FeatureBase);

  var _super = _createSuper(Instrument);

  function Instrument(agentIdentifier) {
    var _this;

    _classCallCheck(this, Instrument);

    _this = _super.call(this, agentIdentifier);
    (0,handle/* handle */.pr)('mark', ['firstbyte', (0,now/* getLastTimestamp */.yf)()], null, 'api', _this.ee);
    onWindowLoad(function () {
      return _this.measureWindowLoaded();
    });
    onDOMContentLoaded(function () {
      return _this.measureDomContentLoaded();
    });
    return _this;
  }

  _createClass(Instrument, [{
    key: "measureWindowLoaded",
    value: function measureWindowLoaded() {
      var ts = (0,now/* now */.zO)();
      (0,handle/* handle */.pr)('mark', ['onload', ts + (0,now/* getOffset */.os)()], null, 'api', this.ee);
      (0,handle/* handle */.pr)('timing', ['load', ts], undefined, undefined, this.ee);
    }
  }, {
    key: "measureDomContentLoaded",
    value: function measureDomContentLoaded() {
      (0,handle/* handle */.pr)('mark', ['domContent', (0,now/* now */.zO)() + (0,now/* getOffset */.os)()], null, 'api', this.ee);
    }
  }]);

  return Instrument;
}(feature_base/* FeatureBase */.W);

/***/ }),

/***/ 1095:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Aggregate": function() { return /* binding */ Aggregate; }
/* harmony export */ });
/* harmony import */ var _common_serialize_bel_serializer__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(6389);
/* harmony import */ var _common_timing_now__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(9433);
/* harmony import */ var _common_util_map_own__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(1599);
/* harmony import */ var _common_harvest_harvest_scheduler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6898);
/* harmony import */ var _common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8244);
/* harmony import */ var _common_url_clean_url__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(8413);
/* harmony import */ var _common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(8668);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(1525);
/* harmony import */ var _common_util_feature_base__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(9077);
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */









var Aggregate = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Aggregate, _FeatureBase);

  var _super = _createSuper(Aggregate);

  function Aggregate(agentIdentifier, aggregator) {
    var _this;

    _classCallCheck(this, Aggregate);

    _this = _super.call(this, agentIdentifier, aggregator);
    _this.timings = [];
    _this.timingsSent = [];
    _this.lcpRecorded = false;
    _this.lcp = null;
    _this.clsSupported = false;
    _this.cls = 0;
    _this.clsSession = {
      value: 0,
      firstEntryTime: 0,
      lastEntryTime: 0
    };
    _this.pageHideRecorded = false;
    _this.harvestTimeSeconds = 30;

    try {
      clsSupported = PerformanceObserver.supportedEntryTypes.includes('layout-shift'); // eslint-disable-line no-undef
    } catch (e) {// do nothing
    }

    if (!_this.options) _this.options = {};
    var maxLCPTimeSeconds = _this.options.maxLCPTimeSeconds || 60;
    var initialHarvestSeconds = _this.options.initialHarvestSeconds || 10;
    _this.harvestTimeSeconds = _this.options.harvestTimeSeconds || 30;
    _this.scheduler = new _common_harvest_harvest_scheduler__WEBPACK_IMPORTED_MODULE_0__/* .HarvestScheduler */ .o('events', {
      onFinished: function onFinished() {
        var _this2;

        return (_this2 = _this).onHarvestFinished.apply(_this2, arguments);
      },
      getPayload: function getPayload() {
        var _this3;

        return (_this3 = _this).prepareHarvest.apply(_this3, arguments);
      },
      onUnload: function onUnload() {
        return _this.finalHarvest();
      }
    }, _assertThisInitialized(_this));
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_1__/* .defaultRegister */ .rP)('timing', function () {
      var _this4;

      return (_this4 = _this).processTiming.apply(_this4, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_1__/* .defaultRegister */ .rP)('lcp', function () {
      var _this5;

      return (_this5 = _this).updateLatestLcp.apply(_this5, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_1__/* .defaultRegister */ .rP)('cls', function () {
      var _this6;

      return (_this6 = _this).updateClsScore.apply(_this6, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_1__/* .defaultRegister */ .rP)('pageHide', function () {
      var _this7;

      return (_this7 = _this).updatePageHide.apply(_this7, arguments);
    }, undefined, _this.ee); // final harvest is initiated from the main agent module, but since harvesting
    // here is not initiated by the harvester, we need to subscribe to the unload event
    // separately
    // subscribeToUnload((...args) => this.finalHarvest(...args))
    // After 1 minute has passed, record LCP value if no user interaction has occurred first

    setTimeout(function () {
      _this.recordLcp();

      _this.lcpRecorded = true;
    }, maxLCPTimeSeconds * 1000); // send initial data sooner, then start regular

    _this.scheduler.startTimer(_this.harvestTimeSeconds, initialHarvestSeconds);

    return _this;
  }

  _createClass(Aggregate, [{
    key: "recordLcp",
    value: function recordLcp() {
      if (!this.lcpRecorded && this.lcp !== null) {
        var lcpEntry = this.lcp[0];
        var cls = this.lcp[1];
        var networkInfo = this.lcp[2];
        var attrs = {
          'size': lcpEntry.size,
          'eid': lcpEntry.id
        };

        if (networkInfo) {
          if (networkInfo['net-type']) attrs['net-type'] = networkInfo['net-type'];
          if (networkInfo['net-etype']) attrs['net-etype'] = networkInfo['net-etype'];
          if (networkInfo['net-rtt']) attrs['net-rtt'] = networkInfo['net-rtt'];
          if (networkInfo['net-dlink']) attrs['net-dlink'] = networkInfo['net-dlink'];
        }

        if (lcpEntry.url) {
          attrs['elUrl'] = (0,_common_url_clean_url__WEBPACK_IMPORTED_MODULE_2__/* .cleanURL */ .f)(lcpEntry.url);
        }

        if (lcpEntry.element && lcpEntry.element.tagName) {
          attrs['elTag'] = lcpEntry.element.tagName;
        } // collect 0 only when CLS is supported, since 0 is a valid score


        if (cls > 0 || this.clsSupported) {
          attrs['cls'] = cls;
        }

        this.addTiming('lcp', Math.floor(lcpEntry.startTime), attrs, false);
        this.lcpRecorded = true;
      }
    }
  }, {
    key: "updateLatestLcp",
    value: function updateLatestLcp(lcpEntry, networkInformation) {
      if (this.lcp) {
        var previous = this.lcp[0];

        if (previous.size >= lcpEntry.size) {
          return;
        }
      }

      this.lcp = [lcpEntry, this.cls, networkInformation];
    }
  }, {
    key: "updateClsScore",
    value: function updateClsScore(clsEntry) {
      // this used to be cumulative for the whole page, now we need to split it to a
      // new CLS measurement after 1s between shifts or 5s total
      if (clsEntry.startTime - this.clsSession.lastEntryTime > 1000 || clsEntry.startTime - this.clsSession.firstEntryTime > 5000) {
        this.clsSession = {
          value: 0,
          firstEntryTime: clsEntry.startTime,
          lastEntryTime: clsEntry.startTime
        };
      }

      this.clsSession.value += clsEntry.value;
      this.clsSession.lastEntryTime = Math.max(this.clsSession.lastEntryTime, clsEntry.startTime); // only keep the biggest CLS we've observed

      if (this.cls < this.clsSession.value) this.cls = this.clsSession.value;
    }
  }, {
    key: "updatePageHide",
    value: function updatePageHide(timestamp) {
      if (!this.pageHideRecorded) {
        this.addTiming('pageHide', timestamp, null, true);
        this.pageHideRecorded = true;
      }
    }
  }, {
    key: "recordUnload",
    value: function recordUnload() {
      this.updatePageHide((0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)());
      this.addTiming('unload', (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)(), null, true);
    }
  }, {
    key: "addTiming",
    value: function addTiming(name, value, attrs, addCls) {
      attrs = attrs || {}; // collect 0 only when CLS is supported, since 0 is a valid score

      if ((this.cls > 0 || this.clsSupported) && addCls) {
        attrs['cls'] = this.cls;
      }

      this.timings.push({
        name: name,
        value: value,
        attrs: attrs
      });
      (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__/* .handle */ .pr)('pvtAdded', [name, value, attrs]);
    }
  }, {
    key: "processTiming",
    value: function processTiming(name, value, attrs) {
      // Upon user interaction, the Browser stops executing LCP logic, so we can send here
      // We're using setTimeout to give the Browser time to finish collecting LCP value
      if (name === 'fi') {
        setTimeout(this.recordLcp, 0);
      }

      this.addTiming(name, value, attrs, true);
    }
  }, {
    key: "onHarvestFinished",
    value: function onHarvestFinished(result) {
      if (result.retry && this.timingsSent.length > 0) {
        for (var i = 0; i < this.timingsSent.length; i++) {
          this.timings.push(this.timingsSent[i]);
        }

        this.timingsSent = [];
      }
    }
  }, {
    key: "finalHarvest",
    value: function finalHarvest() {
      this.recordLcp();
      this.recordUnload();
      var payload = this.prepareHarvest({
        retry: false
      });
      this.scheduler.harvest.send('events', payload, {
        unload: true
      });
    }
  }, {
    key: "appendGlobalCustomAttributes",
    value: function appendGlobalCustomAttributes(timing) {
      var timingAttributes = timing.attrs || {};
      var customAttributes = (0,_common_config_config__WEBPACK_IMPORTED_MODULE_5__/* .getInfo */ .C)(this.agentIdentifier).jsAttributes || {};
      var reservedAttributes = ['size', 'eid', 'cls', 'type', 'fid', 'elTag', 'elUrl', 'net-type', 'net-etype', 'net-rtt', 'net-dlink'];
      (0,_common_util_map_own__WEBPACK_IMPORTED_MODULE_6__/* .mapOwn */ .D)(customAttributes, function (key, val) {
        if (reservedAttributes.indexOf(key) < 0) {
          timingAttributes[key] = val;
        }
      });
    } // serialize and return current timing data, clear and save current data for retry

  }, {
    key: "prepareHarvest",
    value: function prepareHarvest(options) {
      if (this.timings.length === 0) return;
      var payload = this.getPayload(this.timings);

      if (options.retry) {
        for (var i = 0; i < this.timings.length; i++) {
          this.timingsSent.push(this.timings[i]);
        }
      }

      this.timings = [];
      return {
        body: {
          e: payload
        }
      };
    } // serialize array of timing data

  }, {
    key: "getPayload",
    value: function getPayload(data) {
      var addString = (0,_common_serialize_bel_serializer__WEBPACK_IMPORTED_MODULE_7__/* .getAddStringContext */ .FX)();
      var payload = 'bel.6;';

      for (var i = 0; i < data.length; i++) {
        var timing = data[i];
        payload += 'e,';
        payload += addString(timing.name) + ',';
        payload += (0,_common_serialize_bel_serializer__WEBPACK_IMPORTED_MODULE_7__/* .nullable */ .AG)(timing.value, _common_serialize_bel_serializer__WEBPACK_IMPORTED_MODULE_7__/* .numeric */ .uR, false) + ',';
        this.appendGlobalCustomAttributes(timing);
        var attrParts = (0,_common_serialize_bel_serializer__WEBPACK_IMPORTED_MODULE_7__/* .addCustomAttributes */ .n1)(timing.attrs, addString);

        if (attrParts && attrParts.length > 0) {
          payload += (0,_common_serialize_bel_serializer__WEBPACK_IMPORTED_MODULE_7__/* .numeric */ .uR)(attrParts.length) + ';' + attrParts.join(';');
        }

        if (i + 1 < data.length) payload += ';';
      }

      return payload;
    }
  }]);

  return Aggregate;
}(_common_util_feature_base__WEBPACK_IMPORTED_MODULE_8__/* .FeatureBase */ .W);

/***/ }),

/***/ 1003:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Instrument": function() { return /* binding */ Instrument; }
});

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-emitter/handle.js
var handle = __webpack_require__(8668);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/event-listener/event-listener-opts.js
var event_listener_opts = __webpack_require__(3207);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/window/visibility.js
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var visibility_hidden, eventName, state;

if (typeof document.hidden !== 'undefined') {
  visibility_hidden = 'hidden';
  eventName = 'visibilitychange';
  state = 'visibilityState';
} else if (typeof document.msHidden !== 'undefined') {
  visibility_hidden = 'msHidden';
  eventName = 'msvisibilitychange';
} else if (typeof document.webkitHidden !== 'undefined') {
  visibility_hidden = 'webkitHidden';
  eventName = 'webkitvisibilitychange';
  state = 'webkitVisibilityState';
}

function subscribeToVisibilityChange(cb) {
  if ('addEventListener' in document && eventName) {
    document.addEventListener(eventName, handleVisibilityChange, (0,event_listener_opts/* eventListenerOpts */.m)(false));
  }

  function handleVisibilityChange() {
    if (state && document[state]) {
      cb(document[state]);
    } else if (document[visibility_hidden]) {
      cb('hidden');
    } else {
      cb('visible');
    }
  }
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/window/nreum.js
var nreum = __webpack_require__(2378);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/timing/now.js
var now = __webpack_require__(9433);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/init.js
var init = __webpack_require__(1311);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/feature-base.js
var feature_base = __webpack_require__(9077);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/features/page-view-timing/instrument/index.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */







var Instrument = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Instrument, _FeatureBase);

  var _super = _createSuper(Instrument);

  function Instrument(agentIdentifier) {
    var _this;

    _classCallCheck(this, Instrument);

    _this = _super.call(this, agentIdentifier);
    _this.pageHiddenTime;
    _this.performanceObserver;
    _this.lcpPerformanceObserver;
    _this.clsPerformanceObserver;
    _this.fiRecorded = false;

    if (_this.isEnabled()) {
      if ('PerformanceObserver' in window && typeof window.PerformanceObserver === 'function') {
        // passing in an unknown entry type to observer could throw an exception
        _this.performanceObserver = new PerformanceObserver(perfObserver); // eslint-disable-line no-undef

        try {
          _this.performanceObserver.observe({
            entryTypes: ['paint']
          });
        } catch (e) {// do nothing
        }

        _this.lcpPerformanceObserver = new PerformanceObserver(lcpObserver); // eslint-disable-line no-undef

        try {
          _this.lcpPerformanceObserver.observe({
            entryTypes: ['largest-contentful-paint']
          });
        } catch (e) {// do nothing
        }

        _this.clsPerformanceObserver = new PerformanceObserver(clsObserver); // eslint-disable-line no-undef

        try {
          _this.clsPerformanceObserver.observe({
            type: 'layout-shift',
            buffered: true
          });
        } catch (e) {// do nothing
        }
      } // first interaction and first input delay


      if ('addEventListener' in document) {
        _this.fiRecorded = false;
        var allowedEventTypes = ['click', 'keydown', 'mousedown', 'pointerdown', 'touchstart'];
        allowedEventTypes.forEach(function (e) {
          document.addEventListener(e, function () {
            var _this2;

            return (_this2 = _this).captureInteraction.apply(_this2, arguments);
          }, (0,event_listener_opts/* eventListenerOpts */.m)(false));
        });
      } // page visibility events


      subscribeToVisibilityChange(function () {
        var _this3;

        return (_this3 = _this).captureVisibilityChange.apply(_this3, arguments);
      });
    }

    return _this;
  }

  _createClass(Instrument, [{
    key: "isEnabled",
    value: function isEnabled() {
      return (0,init/* getConfigurationValue */.Mt)(this.agentIdentifier, 'page_view_timing.enabled') !== false;
    } // paint metrics

  }, {
    key: "perfObserver",
    value: function perfObserver(list, observer) {
      var _this4 = this;

      var entries = list.getEntries();
      entries.forEach(function (entry) {
        if (entry.name === 'first-paint') {
          (0,handle/* handle */.pr)('timing', ['fp', Math.floor(entry.startTime)], undefined, undefined, _this4.ee);
        } else if (entry.name === 'first-contentful-paint') {
          (0,handle/* handle */.pr)('timing', ['fcp', Math.floor(entry.startTime)], undefined, undefined, _this4.ee);
        }
      });
    } // largest contentful paint

  }, {
    key: "lcpObserver",
    value: function lcpObserver(list, observer) {
      var entries = list.getEntries();

      if (entries.length > 0) {
        var entry = entries[entries.length - 1];
        if (this.pageHiddenTime && this.pageHiddenTime < entry.startTime) return;
        var payload = [entry];
        var attributes = this.addConnectionAttributes({});
        if (attributes) payload.push(attributes);
        (0,handle/* handle */.pr)('lcp', payload, undefined, undefined, this.ee);
      }
    }
  }, {
    key: "clsObserver",
    value: function clsObserver(list) {
      list.getEntries().forEach(function (entry) {
        if (!entry.hadRecentInput) {
          (0,handle/* handle */.pr)('cls', [entry], undefined, undefined, this.ee);
        }
      });
    } // takes an attributes object and appends connection attributes if available

  }, {
    key: "addConnectionAttributes",
    value: function addConnectionAttributes(attributes) {
      var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!connection) return;
      if (connection.type) attributes['net-type'] = connection.type;
      if (connection.effectiveType) attributes['net-etype'] = connection.effectiveType;
      if (connection.rtt) attributes['net-rtt'] = connection.rtt;
      if (connection.downlink) attributes['net-dlink'] = connection.downlink;
      return attributes;
    }
  }, {
    key: "captureInteraction",
    value: function captureInteraction(evt) {
      // if (evt instanceof origEvent && !fiRecorded) {
      if (evt instanceof (0,nreum/* gosNREUM */.fP)().o.EV && !this.fiRecorded) {
        var fi = Math.round(evt.timeStamp);
        var attributes = {
          type: evt.type
        };
        this.addConnectionAttributes(attributes); // The value of Event.timeStamp is epoch time in some old browser, and relative
        // timestamp in newer browsers. We assume that large numbers represent epoch time.

        if (fi <= (0,now/* now */.zO)()) {
          attributes['fid'] = (0,now/* now */.zO)() - fi;
        } else if (fi > (0,now/* getOffset */.os)() && fi <= Date.now()) {
          fi = fi - (0,now/* getOffset */.os)();
          attributes['fid'] = (0,now/* now */.zO)() - fi;
        } else {
          fi = (0,now/* now */.zO)();
        }

        this.fiRecorded = true;
        (0,handle/* handle */.pr)('timing', ['fi', fi, attributes], undefined, undefined, this.ee);
      }
    }
  }, {
    key: "captureVisibilityChange",
    value: function captureVisibilityChange(state) {
      if (state === 'hidden') {
        this.pageHiddenTime = (0,now/* now */.zO)();
        (0,handle/* handle */.pr)('pageHide', [this.pageHiddenTime], undefined, undefined, this.ee);
      }
    }
  }]);

  return Instrument;
}(feature_base/* FeatureBase */.W);

/***/ }),

/***/ 9782:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Aggregate": function() { return /* binding */ Aggregate; }
/* harmony export */ });
/* harmony import */ var _common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(8244);
/* harmony import */ var _common_harvest_harvest__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3125);
/* harmony import */ var _common_harvest_harvest_scheduler__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(6898);
/* harmony import */ var _common_util_map_own__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(1599);
/* harmony import */ var _common_util_reduce__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(157);
/* harmony import */ var _common_util_stringify__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(902);
/* harmony import */ var _common_url_parse_url__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(5060);
/* harmony import */ var _common_window_supports_performance_observer__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(807);
/* harmony import */ var lodash_slice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1990);
/* harmony import */ var lodash_slice__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash_slice__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1311);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2469);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(1525);
/* harmony import */ var _common_timing_start_time__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7704);
/* harmony import */ var _common_timing_now__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(9433);
/* harmony import */ var _common_util_feature_base__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(9077);
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */













var Aggregate = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Aggregate, _FeatureBase);

  var _super = _createSuper(Aggregate);

  function Aggregate(agentIdentifier, aggregator) {
    var _this;

    _classCallCheck(this, Aggregate);

    _this = _super.call(this, agentIdentifier, aggregator);
    _this.ptid = '';
    _this.ignoredEvents = {
      // we find that certain events make the data too noisy to be useful
      global: {
        mouseup: true,
        mousedown: true
      },
      // certain events are present both in the window and in PVT metrics.  PVT metrics are prefered so the window events should be ignored
      window: {
        load: true,
        pagehide: true
      }
    };
    _this.toAggregate = {
      typing: [1000, 2000],
      scrolling: [100, 1000],
      mousing: [1000, 2000],
      touching: [1000, 2000]
    };
    _this.rename = {
      typing: {
        keydown: true,
        keyup: true,
        keypress: true
      },
      mousing: {
        mousemove: true,
        mouseenter: true,
        mouseleave: true,
        mouseover: true,
        mouseout: true
      },
      scrolling: {
        scroll: true
      },
      touching: {
        touchstart: true,
        touchmove: true,
        touchend: true,
        touchcancel: true,
        touchenter: true,
        touchleave: true
      }
    };
    _this.trace = {};
    _this.nodeCount = 0;
    _this.sentTrace = null;
    _this.harvestTimeSeconds = (0,_common_config_config__WEBPACK_IMPORTED_MODULE_1__/* .getConfigurationValue */ .Mt)(_this.agentIdentifier, 'stn.harvestTimeSeconds') || 10;
    _this.maxNodesPerHarvest = (0,_common_config_config__WEBPACK_IMPORTED_MODULE_1__/* .getConfigurationValue */ .Mt)(_this.agentIdentifier, 'stn.maxNodesPerHarvest') || 1000;
    _this.laststart = 0;
    (0,_common_timing_start_time__WEBPACK_IMPORTED_MODULE_2__/* .findStartTime */ .v)();
    if (!_common_harvest_harvest__WEBPACK_IMPORTED_MODULE_3__/* .xhrUsable */ .y0) return _possibleConstructorReturn(_this); // bail if not instrumented

    if (!(0,_common_config_config__WEBPACK_IMPORTED_MODULE_4__/* .getRuntime */ .O)(_this.agentIdentifier).features.stn) return _possibleConstructorReturn(_this); // ee.on('feat-stn', () => {

    _this.storeTiming(window.performance.timing); // onHarvest('resources', prepareHarvest)


    var scheduler = new _common_harvest_harvest_scheduler__WEBPACK_IMPORTED_MODULE_5__/* .HarvestScheduler */ .o('resources', {
      onFinished: function onFinished() {
        return onHarvestFinished.apply(void 0, arguments);
      },
      retryDelay: function retryDelay() {
        var _this2;

        return (_this2 = _this).harvestTimeSeconds.apply(_this2, arguments);
      } // onUnload: () => this.finalHarvest() // no special actions needed before unloading

    });
    scheduler.runHarvest({
      needResponse: true
    });
    scheduler.harvest.on('resources', function () {
      return prepareHarvest.apply(void 0, arguments);
    });

    function onHarvestFinished(result) {
      // start timer only if ptid was returned by server
      if (result.sent && result.responseText && !this.ptid) {
        this.ptid = result.responseText;
        (0,_common_config_config__WEBPACK_IMPORTED_MODULE_4__/* .getRuntime */ .O)(this.agentIdentifier).ptid = this.ptid;
        scheduler.startTimer(this.harvestTimeSeconds);
      }

      if (result.sent && result.retry && this.sentTrace) {
        (0,_common_util_map_own__WEBPACK_IMPORTED_MODULE_6__/* .mapOwn */ .D)(this.sentTrace, function (name, nodes) {
          this.mergeSTNs(name, nodes);
        });
        this.sentTrace = null;
      }
    }

    function prepareHarvest(options) {
      if ((0,_common_timing_now__WEBPACK_IMPORTED_MODULE_7__/* .now */ .zO)() > 15 * 60 * 1000) {
        // been collecting for over 15 min, empty trace object and bail
        scheduler.stopTimer();
        this.trace = {};
        return;
      } // only send when there are more than 30 nodes to send


      if (this.ptid && this.nodeCount <= 30) return;
      return this.takeSTNs(options.retry);
    }

    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_8__/* .registerHandler */ .XN)('bst', function () {
      var _this3;

      return (_this3 = _this).storeEvent.apply(_this3, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_8__/* .registerHandler */ .XN)('bstTimer', function () {
      var _this4;

      return (_this4 = _this).storeTimer.apply(_this4, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_8__/* .registerHandler */ .XN)('bstResource', function () {
      var _this5;

      return (_this5 = _this).storeResources.apply(_this5, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_8__/* .registerHandler */ .XN)('bstHist', function () {
      var _this6;

      return (_this6 = _this).storeHist.apply(_this6, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_8__/* .registerHandler */ .XN)('bstXhrAgg', function () {
      var _this7;

      return (_this7 = _this).storeXhrAgg.apply(_this7, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_8__/* .registerHandler */ .XN)('bstApi', function () {
      var _this8;

      return (_this8 = _this).storeSTN.apply(_this8, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_8__/* .registerHandler */ .XN)('errorAgg', function () {
      var _this9;

      return (_this9 = _this).storeErrorAgg.apply(_this9, arguments);
    }, undefined, _this.ee);
    (0,_common_event_emitter_register_handler__WEBPACK_IMPORTED_MODULE_8__/* .registerHandler */ .XN)('pvtAdded', function () {
      var _this10;

      return (_this10 = _this).processPVT.apply(_this10, arguments);
    }, undefined, _this.ee); // })

    return _this;
  }

  _createClass(Aggregate, [{
    key: "processPVT",
    value: function processPVT(name, value, attrs) {
      var t = {};
      t[name] = value;
      this.storeTiming(t, true);
      if (this.hasFID(name, attrs)) this.storeEvent({
        type: 'fid',
        target: 'document'
      }, 'document', value, value + attrs.fid);
    }
  }, {
    key: "storeTiming",
    value: function storeTiming(_t, ignoreOffset) {
      var key;
      var val;
      var timeOffset;
      var dateNow = Date.now(); // loop iterates through prototype also (for FF)

      for (key in _t) {
        val = _t[key]; // ignore inherited methods, meaningless 0 values, and bogus timestamps
        // that are in the future (Microsoft Edge seems to sometimes produce these)

        if (!(typeof val === 'number' && val > 0 && val < dateNow)) continue;
        timeOffset = !ignoreOffset ? _t[key] - (0,_common_config_config__WEBPACK_IMPORTED_MODULE_4__/* .getRuntime */ .O)(this.agentIdentifier).offset : _t[key];
        this.storeSTN({
          n: key,
          s: timeOffset,
          e: timeOffset,
          o: 'document',
          t: 'timing'
        });
      }
    }
  }, {
    key: "storeTimer",
    value: function storeTimer(target, start, end, type) {
      var category = 'timer';
      if (type === 'requestAnimationFrame') category = type;
      var evt = {
        n: type,
        s: start,
        e: end,
        o: 'window',
        t: category
      };
      this.storeSTN(evt);
    }
  }, {
    key: "storeEvent",
    value: function storeEvent(currentEvent, target, start, end) {
      if (this.shouldIgnoreEvent(currentEvent, target)) return false;
      var evt = {
        n: this.evtName(currentEvent.type),
        s: start,
        e: end,
        t: 'event'
      };

      try {
        // webcomponents-lite.js can trigger an exception on currentEvent.target getter because
        // it does not check currentEvent.currentTarget before calling getRootNode() on it
        evt.o = this.evtOrigin(currentEvent.target, target);
      } catch (e) {
        evt.o = this.evtOrigin(null, target);
      }

      this.storeSTN(evt);
    }
  }, {
    key: "evtName",
    value: function evtName(type) {
      var name = type;
      (0,_common_util_map_own__WEBPACK_IMPORTED_MODULE_6__/* .mapOwn */ .D)(this.rename, function (key, val) {
        if (type in val) name = key;
      });
      return name;
    }
  }, {
    key: "evtOrigin",
    value: function evtOrigin(t, target) {
      var origin = 'unknown';

      if (t && t instanceof XMLHttpRequest) {
        var params = this.ee.context(t).params;
        origin = params.status + ' ' + params.method + ': ' + params.host + params.pathname;
      } else if (t && typeof t.tagName === 'string') {
        origin = t.tagName.toLowerCase();
        if (t.id) origin += '#' + t.id;
        if (t.className) origin += '.' + lodash_slice__WEBPACK_IMPORTED_MODULE_0___default()(t.classList).join('.');
      }

      if (origin === 'unknown') {
        if (typeof target === 'string') origin = target;else if (target === document) origin = 'document';else if (target === window) origin = 'window';else if (target instanceof FileReader) origin = 'FileReader';
      }

      return origin;
    }
  }, {
    key: "storeHist",
    value: function storeHist(path, old, time) {
      var node = {
        n: 'history.pushState',
        s: time,
        e: time,
        o: path,
        t: old
      };
      this.storeSTN(node);
    }
  }, {
    key: "storeResources",
    value: function storeResources(resources) {
      if (!resources || resources.length === 0) return;
      resources.forEach(function (currentResource) {
        var parsed = (0,_common_url_parse_url__WEBPACK_IMPORTED_MODULE_9__/* .parseUrl */ .e)(currentResource.name);
        var res = {
          n: currentResource.initiatorType,
          s: currentResource.fetchStart | 0,
          e: currentResource.responseEnd | 0,
          o: parsed.protocol + '://' + parsed.hostname + ':' + parsed.port + parsed.pathname,
          // resource.name is actually a URL so it's the source
          t: currentResource.entryType
        }; // don't recollect old resources

        if (res.s <= this.laststart) return;
        this.storeSTN(res);
      });
      this.laststart = resources[resources.length - 1].fetchStart | 0;
    }
  }, {
    key: "storeErrorAgg",
    value: function storeErrorAgg(type, name, params, metrics) {
      if (type !== 'err') return;
      var node = {
        n: 'error',
        s: metrics.time,
        e: metrics.time,
        o: params.message,
        t: params.stackHash
      };
      this.storeSTN(node);
    }
  }, {
    key: "storeXhrAgg",
    value: function storeXhrAgg(type, name, params, metrics) {
      if (type !== 'xhr') return;
      var node = {
        n: 'Ajax',
        s: metrics.time,
        e: metrics.time + metrics.duration,
        o: params.status + ' ' + params.method + ': ' + params.host + params.pathname,
        t: 'ajax'
      };
      this.storeSTN(node);
    }
  }, {
    key: "storeSTN",
    value: function storeSTN(stn) {
      // limit the number of data that is stored
      if (this.nodeCount >= this.maxNodesPerHarvest) return;
      var traceArr = this.trace[stn.n];
      if (!traceArr) traceArr = this.trace[stn.n] = [];
      traceArr.push(stn);
      this.nodeCount++;
    }
  }, {
    key: "mergeSTNs",
    value: function mergeSTNs(key, nodes) {
      // limit the number of data that is stored
      if (this.nodeCount >= this.maxNodesPerHarvest) return;
      var traceArr = this.trace[key];
      if (!traceArr) traceArr = this.trace[key] = [];
      this.trace[key] = nodes.concat(traceArr);
      this.nodeCount += nodes.length;
    }
  }, {
    key: "takeSTNs",
    value: function takeSTNs(retry) {
      // if the observer is not being used, this checks resourcetiming buffer every harvest
      if (!(0,_common_window_supports_performance_observer__WEBPACK_IMPORTED_MODULE_10__/* .supportsPerformanceObserver */ .W)()) {
        this.storeResources(window.performance.getEntriesByType('resource'));
      }

      var stns = (0,_common_util_reduce__WEBPACK_IMPORTED_MODULE_11__/* .reduce */ .u)((0,_common_util_map_own__WEBPACK_IMPORTED_MODULE_6__/* .mapOwn */ .D)(this.trace, function (name, nodes) {
        if (!(name in this.toAggregate)) return nodes;
        return (0,_common_util_reduce__WEBPACK_IMPORTED_MODULE_11__/* .reduce */ .u)((0,_common_util_map_own__WEBPACK_IMPORTED_MODULE_6__/* .mapOwn */ .D)((0,_common_util_reduce__WEBPACK_IMPORTED_MODULE_11__/* .reduce */ .u)(nodes.sort(this.byStart), this.smearEvtsByOrigin(name), {}), this.val), this.flatten, []);
      }), this.flatten, []);
      if (stns.length === 0) return {};

      if (retry) {
        this.sentTrace = this.trace;
      }

      this.trace = {};
      this.nodeCount = 0;
      var stnInfo = {
        qs: {
          st: '' + (0,_common_config_config__WEBPACK_IMPORTED_MODULE_4__/* .getRuntime */ .O)(this.agentIdentifier).offset
        },
        body: {
          res: stns
        }
      };

      if (!this.ptid) {
        var _getInfo = (0,_common_config_config__WEBPACK_IMPORTED_MODULE_12__/* .getInfo */ .C)(this.agentIdentifier),
            userAttributes = _getInfo.userAttributes,
            atts = _getInfo.atts,
            jsAttributes = _getInfo.jsAttributes;

        stnInfo.qs.ua = userAttributes;
        stnInfo.qs.at = atts;
        var ja = (0,_common_util_stringify__WEBPACK_IMPORTED_MODULE_13__/* .stringify */ .P)(jsAttributes);
        stnInfo.qs.ja = ja === '{}' ? null : ja;
      }

      return stnInfo;
    }
  }, {
    key: "byStart",
    value: function byStart(a, b) {
      return a.s - b.s;
    }
  }, {
    key: "smearEvtsByOrigin",
    value: function smearEvtsByOrigin(name) {
      var maxGap = this.toAggregate[name][0];
      var maxLen = this.toAggregate[name][1];
      var lastO = {};
      return function (byOrigin, evt) {
        var lastArr = byOrigin[evt.o];
        lastArr || (lastArr = byOrigin[evt.o] = []);
        var last = lastO[evt.o];

        if (name === 'scrolling' && !this.trivial(evt)) {
          lastO[evt.o] = null;
          evt.n = 'scroll';
          lastArr.push(evt);
        } else if (last && evt.s - last.s < maxLen && last.e > evt.s - maxGap) {
          last.e = evt.e;
        } else {
          lastO[evt.o] = evt;
          lastArr.push(evt);
        }

        return byOrigin;
      };
    }
  }, {
    key: "val",
    value: function val(key, value) {
      return value;
    }
  }, {
    key: "flatten",
    value: function flatten(a, b) {
      return a.concat(b);
    }
  }, {
    key: "hasFID",
    value: function hasFID(name, attrs) {
      return name === 'fi' && !!attrs && typeof attrs.fid === 'number';
    }
  }, {
    key: "trivial",
    value: function trivial(node) {
      var limit = 4;
      if (node && typeof node.e === 'number' && typeof node.s === 'number' && node.e - node.s < limit) return true;else return false;
    }
  }, {
    key: "shouldIgnoreEvent",
    value: function shouldIgnoreEvent(event, target) {
      var origin = this.evtOrigin(event.target, target);
      if (event.type in this.ignoredEvents.global) return true;
      if (!!this.ignoredEvents[origin] && event.type in this.ignoredEvents[origin]) return true;
      return false;
    }
  }]);

  return Aggregate;
}(_common_util_feature_base__WEBPACK_IMPORTED_MODULE_14__/* .FeatureBase */ .W);

/***/ }),

/***/ 3013:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Instrument": function() { return /* binding */ Instrument; }
/* harmony export */ });
/* harmony import */ var _common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(8668);
/* harmony import */ var _common_wrap__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7423);
/* harmony import */ var _common_window_supports_performance_observer__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(807);
/* harmony import */ var _common_event_listener_event_listener_opts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(3207);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5301);
/* harmony import */ var _common_config_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2469);
/* harmony import */ var _common_timing_now__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(9433);
/* harmony import */ var _common_util_feature_base__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(9077);
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */







var learResourceTimings = 'learResourceTimings';
var ADD_EVENT_LISTENER = 'addEventListener';
var REMOVE_EVENT_LISTENER = 'removeEventListener';
var RESOURCE_TIMING_BUFFER_FULL = 'resourcetimingbufferfull';
var BST_RESOURCE = 'bstResource';
var RESOURCE = 'resource';
var START = '-start';
var END = '-end';
var FN_START = 'fn' + START;
var FN_END = 'fn' + END;
var BST_TIMER = 'bstTimer';
var PUSH_STATE = 'pushState';
var origEvent = _common_config_config__WEBPACK_IMPORTED_MODULE_0__/* .originals.EV */ .Y.EV;
var Instrument = /*#__PURE__*/function (_FeatureBase) {
  _inherits(Instrument, _FeatureBase);

  var _super = _createSuper(Instrument);

  function Instrument(agentIdentifier) {
    var _this;

    _classCallCheck(this, Instrument);

    _this = _super.call(this, agentIdentifier);
    (0,_common_config_config__WEBPACK_IMPORTED_MODULE_1__/* .getRuntime */ .O)(_this.agentIdentifier).features.stn = true;
    _this.timerEE = (0,_common_wrap__WEBPACK_IMPORTED_MODULE_2__/* .wrapTimer */ .BV)(_this.ee);
    _this.rafEE = (0,_common_wrap__WEBPACK_IMPORTED_MODULE_2__/* .wrapRaf */ .gy)(_this.ee);
    (0,_common_wrap__WEBPACK_IMPORTED_MODULE_2__/* .wrapHistory */ .QU)(_this.ee);
    (0,_common_wrap__WEBPACK_IMPORTED_MODULE_2__/* .wrapEvents */ .em)(_this.ee);
    if (!(window.performance && window.performance.timing && window.performance.getEntriesByType)) return _possibleConstructorReturn(_this);

    _this.ee.on(FN_START, function (args, target) {
      var evt = args[0];

      if (evt instanceof origEvent) {
        this.bstStart = (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)();
      }
    });

    _this.ee.on(FN_END, function (args, target) {
      var evt = args[0];

      if (evt instanceof origEvent) {
        (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__/* .handle */ .pr)('bst', [evt, target, this.bstStart, (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)()]);
      }
    });

    _this.timerEE.on(FN_START, function (args, obj, type) {
      this.bstStart = (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)();
      this.bstType = type;
    });

    _this.timerEE.on(FN_END, function (args, target) {
      (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__/* .handle */ .pr)(BST_TIMER, [target, this.bstStart, (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)(), this.bstType]);
    });

    _this.rafEE.on(FN_START, function () {
      this.bstStart = (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)();
    });

    _this.rafEE.on(FN_END, function (args, target) {
      (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__/* .handle */ .pr)(BST_TIMER, [target, this.bstStart, (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)(), 'requestAnimationFrame']);
    });

    _this.ee.on(PUSH_STATE + START, function (args) {
      this.time = (0,_common_timing_now__WEBPACK_IMPORTED_MODULE_3__/* .now */ .zO)();
      this.startPath = location.pathname + location.hash;
    });

    _this.ee.on(PUSH_STATE + END, function (args) {
      (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__/* .handle */ .pr)('bstHist', [location.pathname + location.hash, this.startPath, this.time]);
    });

    if ((0,_common_window_supports_performance_observer__WEBPACK_IMPORTED_MODULE_5__/* .supportsPerformanceObserver */ .W)()) {
      // capture initial resources, in case our observer missed anything
      (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__/* .handle */ .pr)(BST_RESOURCE, [window.performance.getEntriesByType('resource')]);

      _this.observeResourceTimings();
    } else {
      // collect resource timings once when buffer is full
      if (ADD_EVENT_LISTENER in window.performance) {
        if (window.performance['c' + learResourceTimings]) {
          window.performance[ADD_EVENT_LISTENER](RESOURCE_TIMING_BUFFER_FULL, _this.onResourceTimingBufferFull, (0,_common_event_listener_event_listener_opts__WEBPACK_IMPORTED_MODULE_6__/* .eventListenerOpts */ .m)(false));
        } else {
          window.performance[ADD_EVENT_LISTENER]('webkit' + RESOURCE_TIMING_BUFFER_FULL, _this.onResourceTimingBufferFull, (0,_common_event_listener_event_listener_opts__WEBPACK_IMPORTED_MODULE_6__/* .eventListenerOpts */ .m)(false));
        }
      }
    }

    document[ADD_EVENT_LISTENER]('scroll', _this.noOp, (0,_common_event_listener_event_listener_opts__WEBPACK_IMPORTED_MODULE_6__/* .eventListenerOpts */ .m)(false));
    document[ADD_EVENT_LISTENER]('keypress', _this.noOp, (0,_common_event_listener_event_listener_opts__WEBPACK_IMPORTED_MODULE_6__/* .eventListenerOpts */ .m)(false));
    document[ADD_EVENT_LISTENER]('click', _this.noOp, (0,_common_event_listener_event_listener_opts__WEBPACK_IMPORTED_MODULE_6__/* .eventListenerOpts */ .m)(false));
    return _this;
  }

  _createClass(Instrument, [{
    key: "observeResourceTimings",
    value: function observeResourceTimings() {
      var observer = new PerformanceObserver(function (list, observer) {
        // eslint-disable-line no-undef
        var entries = list.getEntries();
        (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__/* .handle */ .pr)(BST_RESOURCE, [entries]);
      });

      try {
        observer.observe({
          entryTypes: ['resource']
        });
      } catch (e) {// do nothing
      }
    }
  }, {
    key: "onResourceTimingBufferFull",
    value: function onResourceTimingBufferFull(e) {
      (0,_common_event_emitter_handle__WEBPACK_IMPORTED_MODULE_4__/* .handle */ .pr)(BST_RESOURCE, [window.performance.getEntriesByType(RESOURCE)]); // stop recording once buffer is full

      if (window.performance['c' + learResourceTimings]) {
        try {
          window.performance[REMOVE_EVENT_LISTENER](RESOURCE_TIMING_BUFFER_FULL, this.onResourceTimingBufferFull, false);
        } catch (e) {// do nothing
        }
      } else {
        try {
          window.performance[REMOVE_EVENT_LISTENER]('webkit' + RESOURCE_TIMING_BUFFER_FULL, this.onResourceTimingBufferFull, false);
        } catch (e) {// do nothing
        }
      }
    }
  }, {
    key: "noOp",
    value: function noOp(e) {
      /* no-op */
    }
  }]);

  return Instrument;
}(_common_util_feature_base__WEBPACK_IMPORTED_MODULE_7__/* .FeatureBase */ .W);

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
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		// The chunk loading function for additional chunks
/******/ 		// Since all referenced chunks are already included
/******/ 		// in this file, this function is empty here.
/******/ 		__webpack_require__.e = function() { return Promise.resolve(); };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
!function() {
"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/info.js
var state_info = __webpack_require__(1525);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/init.js
var init = __webpack_require__(1311);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/loader-config.js
var state_loader_config = __webpack_require__(6146);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/config/state/runtime.js + 1 modules
var runtime = __webpack_require__(2469);
;// CONCATENATED MODULE: ../../../../packages/browser-agent/dist/es/types.js
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var NrFeature = /*#__PURE__*/function () {
  function NrFeature(name) {
    _classCallCheck(this, NrFeature);

    this.name = name;
    this._enabled = true;
    this._auto = true;
  }

  _createClass(NrFeature, [{
    key: "enabled",
    get: function get() {
      return this._enabled;
    },
    set: function set(val) {
      this._enabled = Boolean(val);
    }
  }, {
    key: "auto",
    get: function get() {
      return this._auto;
    },
    set: function set(val) {
      this._auto = val;
    }
  }]);

  return NrFeature;
}();
var NrFeatures;

(function (NrFeatures) {
  NrFeatures["JSERRORS"] = "js-errors";
})(NrFeatures || (NrFeatures = {}));
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/timing/now.js
var now = __webpack_require__(9433);
;// CONCATENATED MODULE: ../../../../packages/browser-agent/dist/es/utils/api/api.js
function api_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function api_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function api_createClass(Constructor, protoProps, staticProps) { if (protoProps) api_defineProperties(Constructor.prototype, protoProps); if (staticProps) api_defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }



var Api = /*#__PURE__*/function () {
  function Api(parent) {
    api_classCallCheck(this, Api);

    this.importedMethods = {
      storeError: null
    };
    this._initialized = false;
    this._initialized = true;
    this._parent = parent;
  }

  api_createClass(Api, [{
    key: "noticeError",
    value: function noticeError(err, customAttributes) {
      if (this._initialized && !!this.importedMethods.storeError) {
        if (typeof err !== 'string' && !(err instanceof Error)) return invalidCall('noticeError', err, 'Error | String');
        err = typeof err === 'string' ? new Error(err) : err;
        var time = (0,now/* now */.zO)();
        var internal = false;
        return this.importedMethods.storeError(err, time, internal, customAttributes);
      }

      if (!this._parent.initialized && !this.importedMethods.storeError) return notInitialized(this._parent.id, NrFeatures.JSERRORS);
      if (this._parent.initialized && !this.importedMethods.storeError) return isDisabled(this._parent.id, NrFeatures.JSERRORS, 'noticeError');
    }
  }]);

  return Api;
}();

function notInitialized(agentIdentifier, featureName) {
  console.warn("Agent ".concat(agentIdentifier, " is calling a ").concat(featureName, " Feature API, but the Browser Agent has not been started... Please start the agent using .start({...opts})"));
}

function isDisabled(agentIdentifier, featureName, methodName) {
  console.warn("The ".concat(featureName, " Feature of agent ").concat(agentIdentifier, " Has Been Disabled. Method \"").concat(methodName, "\" will not do anything!"));
}

function invalidCall(methodName, argument, validType) {
  console.warn("\"".concat(methodName, "\" was called with an invalid argument: ").concat(argument, ". This method only accepts ").concat(validType, " types for that argument."));
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent/dist/es/utils/config/build-configs.js
function buildConfigs(options) {
  var info = {
    beacon: '',
    errorBeacon: undefined,
    licenseKey: '',
    applicationID: '',
    sa: undefined,
    queueTime: undefined,
    applicationTime: undefined,
    ttGuid: undefined,
    user: undefined,
    account: undefined,
    product: undefined,
    extra: undefined,
    userAttributes: undefined,
    atts: undefined,
    transactionName: undefined,
    tNamePlain: undefined
  };
  var config = {
    privacy: {
      cookies_enabled: undefined
    },
    ajax: {
      deny_list: undefined
    },
    distributed_tracing: {
      enabled: undefined,
      exclude_newrelic_header: undefined,
      cors_use_newrelic_header: undefined,
      cors_use_tracecontext_headers: undefined,
      allowed_origins: undefined
    },
    page_view_timing: {
      enabled: undefined
    },
    ssl: undefined,
    obfuscate: undefined
  };
  var loader_config = {
    accountID: undefined,
    trustKey: undefined,
    agentID: undefined,
    licenseKey: '',
    applicationID: '',
    xpid: undefined
  };
  Object.keys(options).forEach(function (key) {
    if (key === 'beacon') {
      info.beacon = options[key];
      info.errorBeacon = options[key];
    }

    if (Object.keys(info).includes(key)) info[key] = options[key];
    if (Object.keys(config).includes(key)) config[key] = options[key];
    if (Object.keys(loader_config).includes(key)) loader_config[key] = options[key];
  });
  if (!validateInfo(info) || !validateLoaderConfig(loader_config)) console.warn("Missing required config data");
  return {
    info: info,
    config: config,
    loader_config: loader_config
  };
}

function validateInfo(info) {
  return !(!info.applicationID || !info.licenseKey || !info.beacon);
}

function validateLoaderConfig(loader_config) {
  return !(!loader_config.applicationID || !loader_config.licenseKey);
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent/dist/es/utils/features/features.js
function features_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function features_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function features_createClass(Constructor, protoProps, staticProps) { if (protoProps) features_defineProperties(Constructor.prototype, protoProps); if (staticProps) features_defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }


var Features = /*#__PURE__*/function () {
  function Features() {
    features_classCallCheck(this, Features);

    this.errors = new NrFeature(NrFeatures.JSERRORS);
  }

  features_createClass(Features, [{
    key: "getEnabledFeatures",
    value: function getEnabledFeatures() {
      return Object.values(this).filter(function (feature) {
        return feature.enabled;
      });
    }
  }]);

  return Features;
}();
;// CONCATENATED MODULE: ../../../../packages/browser-agent/dist/es/utils/features/initialize.js
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return generator._invoke = function (innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; }(innerFn, self, context), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; this._invoke = function (method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); }; } function maybeInvokeDelegate(delegate, context) { var method = delegate.iterator[context.method]; if (undefined === method) { if (context.delegate = null, "throw" === context.method) { if (delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel; context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method"); } return ContinueSentinel; } var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) { if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; } return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (object) { var keys = []; for (var key in object) { keys.push(key); } return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) { "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); } }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }

var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};


function initializeFeatures(agentIdentifier, api, sharedAggregator, features) {
  var _this = this;

  return Promise.all(features.getEnabledFeatures().map(function (feature) {
    return __awaiter(_this, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var _yield$import, Instrument, featureInstrumentation, _yield$import2, Aggregate, featureAggregator;

      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!feature.auto) {
                _context.next = 6;
                break;
              }

              _context.next = 3;
              return __webpack_require__(7371)("./".concat(feature.name, "/instrument"));

            case 3:
              _yield$import = _context.sent;
              Instrument = _yield$import.Instrument;
              featureInstrumentation = new Instrument(agentIdentifier);

            case 6:
              _context.next = 8;
              return __webpack_require__(8524)("./".concat(feature.name, "/aggregate"));

            case 8:
              _yield$import2 = _context.sent;
              Aggregate = _yield$import2.Aggregate;
              featureAggregator = new Aggregate(agentIdentifier, sharedAggregator);
              if (feature.name === NrFeatures.JSERRORS) api.importedMethods.storeError = function () {
                return featureAggregator.storeError.apply(featureAggregator, arguments);
              };
              return _context.abrupt("return", feature.name);

            case 13:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));
  }));
}
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/window/nreum.js
var nreum = __webpack_require__(2378);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/ids/unique-id.js
var unique_id = __webpack_require__(3077);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/context/shared-context.js
var shared_context = __webpack_require__(5522);
// EXTERNAL MODULE: ../../../../packages/browser-agent-core/common/util/map-own.js
var map_own = __webpack_require__(1599);
;// CONCATENATED MODULE: ../../../../packages/browser-agent-core/common/aggregate/aggregator.js
function aggregator_typeof(obj) { "@babel/helpers - typeof"; return aggregator_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, aggregator_typeof(obj); }

function aggregator_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function aggregator_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function aggregator_createClass(Constructor, protoProps, staticProps) { if (protoProps) aggregator_defineProperties(Constructor.prototype, protoProps); if (staticProps) aggregator_defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (aggregator_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


var Aggregator = /*#__PURE__*/function (_SharedContext) {
  _inherits(Aggregator, _SharedContext);

  var _super = _createSuper(Aggregator);

  function Aggregator(parent) {
    var _this;

    aggregator_classCallCheck(this, Aggregator);

    _this = _super.call(this, parent);
    _this.aggregatedData = {};
    return _this;
  }

  aggregator_createClass(Aggregator, [{
    key: "store",
    value: function store(type, name, params, newMetrics, customParams) {
      var bucket = this.getBucket(type, name, params, customParams);
      bucket.metrics = aggregateMetrics(newMetrics, bucket.metrics);
      return bucket;
    }
  }, {
    key: "merge",
    value: function merge(type, name, metrics, params, customParams) {
      var bucket = this.getBucket(type, name, params, customParams);

      if (!bucket.metrics) {
        bucket.metrics = metrics;
        return;
      }

      var oldMetrics = bucket.metrics;
      oldMetrics.count += metrics.count; // iterate through each new metric and merge

      (0,map_own/* mapOwn */.D)(metrics, function (key, value) {
        // count is a special case handled above
        if (key === 'count') return;
        var oldMetric = oldMetrics[key];
        var newMetric = metrics[key]; // handling the case where newMetric is a single-value first

        if (newMetric && !newMetric.c) {
          oldMetrics[key] = updateMetric(newMetric.t, oldMetric);
        } else {
          // newMetric is a metric object
          oldMetrics[key] = mergeMetric(newMetric, oldMetrics[key]);
        }
      });
    }
  }, {
    key: "storeMetric",
    value: function storeMetric(type, name, params, value) {
      var bucket = this.getBucket(type, name, params);
      bucket.stats = updateMetric(value, bucket.stats);
      return bucket;
    }
  }, {
    key: "getBucket",
    value: function getBucket(type, name, params, customParams) {
      if (!this.aggregatedData[type]) this.aggregatedData[type] = {};
      var bucket = this.aggregatedData[type][name];

      if (!bucket) {
        bucket = this.aggregatedData[type][name] = {
          params: params || {}
        };

        if (customParams) {
          bucket.custom = customParams;
        }
      }

      return bucket;
    }
  }, {
    key: "get",
    value: function get(type, name) {
      // if name is passed, get a single bucket
      if (name) return this.aggregatedData[type] && this.aggregatedData[type][name]; // else, get all buckets of that type

      return this.aggregatedData[type];
    } // Like get, but for many types and it deletes the retrieved content from the aggregatedData

  }, {
    key: "take",
    value: function take(types) {
      var results = {};
      var type = '';
      var hasData = false;

      for (var i = 0; i < types.length; i++) {
        type = types[i];
        results[type] = toArray(this.aggregatedData[type]);
        if (results[type].length) hasData = true;
        delete this.aggregatedData[type];
      }

      return hasData ? results : null;
    }
  }]);

  return Aggregator;
}(shared_context/* SharedContext */.w);

function aggregateMetrics(newMetrics, oldMetrics) {
  if (!oldMetrics) oldMetrics = {
    count: 0
  };
  oldMetrics.count += 1;
  (0,map_own/* mapOwn */.D)(newMetrics, function (key, value) {
    oldMetrics[key] = updateMetric(value, oldMetrics[key]);
  });
  return oldMetrics;
}

function updateMetric(value, metric) {
  // when there is no value, then send only count
  if (value == null) {
    return updateCounterMetric(metric);
  } // When there is only one data point, the c (count), min, max, and sos (sum of squares) params are superfluous.


  if (!metric) return {
    t: value
  }; // but on the second data point, we need to calculate the other values before aggregating in new values

  if (!metric.c) {
    metric = createMetricObject(metric.t);
  } // at this point, metric is always uncondensed


  metric.c += 1;
  metric.t += value;
  metric.sos += value * value;
  if (value > metric.max) metric.max = value;
  if (value < metric.min) metric.min = value;
  return metric;
}

function updateCounterMetric(metric) {
  if (!metric) {
    metric = {
      c: 1
    };
  } else {
    metric.c++;
  }

  return metric;
}

function mergeMetric(newMetric, oldMetric) {
  if (!oldMetric) return newMetric;

  if (!oldMetric.c) {
    // oldMetric is a single-value
    oldMetric = createMetricObject(oldMetric.t);
  }

  oldMetric.min = Math.min(newMetric.min, oldMetric.min);
  oldMetric.max = Math.max(newMetric.max, oldMetric.max);
  oldMetric.t += newMetric.t;
  oldMetric.sos += newMetric.sos;
  oldMetric.c += newMetric.c;
  return oldMetric;
} // take a value and create a metric object


function createMetricObject(value) {
  return {
    t: value,
    min: value,
    max: value,
    sos: value * value,
    c: 1
  };
}

function toArray(obj) {
  if (aggregator_typeof(obj) !== 'object') return [];
  return (0,map_own/* mapOwn */.D)(obj, getValue);
}

function getValue(key, value) {
  return value;
}
;// CONCATENATED MODULE: ../../../../packages/browser-agent/dist/es/index.js
function es_typeof(obj) { "@babel/helpers - typeof"; return es_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, es_typeof(obj); }

function es_regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ es_regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return generator._invoke = function (innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; }(innerFn, self, context), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == es_typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; this._invoke = function (method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); }; } function maybeInvokeDelegate(delegate, context) { var method = delegate.iterator[context.method]; if (undefined === method) { if (context.delegate = null, "throw" === context.method) { if (delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel; context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method"); } return ContinueSentinel; } var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) { if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; } return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (object) { var keys = []; for (var key in object) { keys.push(key); } return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) { "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); } }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }

function es_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function es_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function es_createClass(Constructor, protoProps, staticProps) { if (protoProps) es_defineProperties(Constructor.prototype, protoProps); if (staticProps) es_defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var es_awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};









var BrowserAgent = /*#__PURE__*/function () {
  function BrowserAgent() {
    var _this = this;

    es_classCallCheck(this, BrowserAgent);

    this._initialized = false;
    this._id = (0,unique_id/* generateRandomHexString */.ky)(16);
    this._api = new Api(this);
    this._aggregator = new Aggregator({
      agentIdentifier: this._id
    });
    this.features = new Features();

    this.start = function (options) {
      return es_awaiter(_this, void 0, void 0, /*#__PURE__*/es_regeneratorRuntime().mark(function _callee() {
        var _buildConfigs, info, config, loader_config, initializedFeatures;

        return es_regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!this._initialized) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt("return", false);

              case 2:
                this._initialized = true;
                _buildConfigs = buildConfigs(options), info = _buildConfigs.info, config = _buildConfigs.config, loader_config = _buildConfigs.loader_config;
                if (info) (0,state_info/* setInfo */.L)(this._id, info);
                if (config) (0,init/* setConfiguration */.Dg)(this._id, config);
                if (loader_config) (0,state_loader_config/* setLoaderConfig */.G)(this._id, config);
                (0,runtime/* setRuntime */.s)(this._id, {
                  maxBytes: 30000
                });
                _context.next = 10;
                return initializeFeatures(this._id, this._api, this._aggregator, this.features);

              case 10:
                initializedFeatures = _context.sent;
                (0,nreum/* gosNREUMInitializedAgents */.Qy)(this._id, initializedFeatures, 'features');
                return _context.abrupt("return", true);

              case 13:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));
    };

    this.noticeError = function (err, customAttributes) {
      return _this._api.noticeError(err, customAttributes);
    };
  }

  es_createClass(BrowserAgent, [{
    key: "config",
    get: function get() {
      return {
        info: (0,state_info/* getInfo */.C)(this._id),
        config: (0,init/* getConfiguration */.P_)(this._id),
        loader_config: (0,state_loader_config/* getLoaderConfig */.D)(this._id)
      };
    }
  }, {
    key: "initialized",
    get: function get() {
      return this._initialized;
    }
  }, {
    key: "id",
    get: function get() {
      return this._id;
    }
  }]);

  return BrowserAgent;
}();
/* harmony default export */ var es = ((/* unused pure expression or super */ null && (BrowserAgent)));
;// CONCATENATED MODULE: ../component-1/index.js
function component_1_typeof(obj) { "@babel/helpers - typeof"; return component_1_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, component_1_typeof(obj); }

function component_1_regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ component_1_regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return generator._invoke = function (innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; }(innerFn, self, context), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == component_1_typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; this._invoke = function (method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); }; } function maybeInvokeDelegate(delegate, context) { var method = delegate.iterator[context.method]; if (undefined === method) { if (context.delegate = null, "throw" === context.method) { if (delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel; context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method"); } return ContinueSentinel; } var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) { if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; } return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (object) { var keys = []; for (var key in object) { keys.push(key); } return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) { "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); } }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function component_1_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function component_1_createClass(Constructor, protoProps, staticProps) { if (protoProps) component_1_defineProperties(Constructor.prototype, protoProps); if (staticProps) component_1_defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function component_1_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function component_1_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) component_1_setPrototypeOf(subClass, superClass); }

function component_1_createSuper(Derived) { var hasNativeReflectConstruct = component_1_isNativeReflectConstruct(); return function _createSuperInternal() { var Super = component_1_getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = component_1_getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return component_1_possibleConstructorReturn(this, result); }; }

function component_1_possibleConstructorReturn(self, call) { if (call && (component_1_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return component_1_assertThisInitialized(self); }

function component_1_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, component_1_getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return component_1_setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function _construct(Parent, args, Class) { if (component_1_isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) component_1_setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function component_1_isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function component_1_setPrototypeOf(o, p) { component_1_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return component_1_setPrototypeOf(o, p); }

function component_1_getPrototypeOf(o) { component_1_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return component_1_getPrototypeOf(o); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

 // 

var nrConfig = _objectSpread(_objectSpread(_objectSpread(_objectSpread({}, NREUM.init), NREUM.info), NREUM.loader_config), {}, {
  // licenseKey: 'asdf',
  applicationID: 1
});

var nr = new BrowserAgent(); // Create a new instance of the Browser Agent

nr.features.errors.auto = false; // Only capture errors through noticeError()

nr.start(nrConfig).then(function () {
  console.debug("agent initialized! -- Puppies Component", nrConfig);
});

var PuppyComponent = /*#__PURE__*/function (_HTMLElement) {
  component_1_inherits(PuppyComponent, _HTMLElement);

  var _super = component_1_createSuper(PuppyComponent);

  function PuppyComponent() {
    var _this;

    component_1_classCallCheck(this, PuppyComponent);

    _this = _super.call(this);

    _defineProperty(component_1_assertThisInitialized(_this), "fetchImg", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/component_1_regeneratorRuntime().mark(function _callee() {
      var params, url, resp, json, result;
      return component_1_regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              params = {
                api_key: 'TMWFkdtKTv6To8CjL9OqC2KBNQTM8D3N',
                q: 'puppy',
                limit: 100
              };
              url = new URL("https://api.giphy.com/v1/gifs/search");
              Object.keys(params).forEach(function (key) {
                return url.searchParams.append(key, params[key]);
              });
              _context.next = 5;
              return fetch(url);

            case 5:
              resp = _context.sent;
              _context.next = 8;
              return resp.json();

            case 8:
              json = _context.sent;
              result = json.data.length > 0 ? json.data[Math.floor(Math.random() * json.data.length)].images.downsized.url : 'https://media.giphy.com/media/3zhxq2ttgN6rEw8SDx/giphy.gif';
              return _context.abrupt("return", result);

            case 11:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    })));

    _defineProperty(component_1_assertThisInitialized(_this), "setImg", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/component_1_regeneratorRuntime().mark(function _callee2() {
      var img;
      return component_1_regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return _this.fetchImg();

            case 2:
              img = _context2.sent;
              _this.elem.src = img;
              _this.elem.style.maxWidth = "100vw";
              _this.elem.style.maxHeight = '250px';

              _this.shadow.appendChild(_this.elem);

              _this.sendError();

            case 8:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    })));

    _defineProperty(component_1_assertThisInitialized(_this), "sendError", function () {
      console.debug("NOTICING (nr.noticeError()) an error in ".concat(_this.name));
      var err = new Error("nr.noticeError() called in ".concat(_this.name, " (Component-1)!"));
      nr.noticeError(err, {
        customAttr: 'hi'
      });
      throw new Error("component-1 threw global error");
    });

    _this.shadow = _this.attachShadow({
      mode: 'open'
    });
    _this.elem = document.createElement('img');
    _this.name = 'Puppy Component';

    _this.setImg();

    return _this;
  }

  return component_1_createClass(PuppyComponent);
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));

_defineProperty(PuppyComponent, "name", "puppy-component");

customElements.define(PuppyComponent.name, PuppyComponent);
function mount(elem) {
  var webComponent = document.createElement(PuppyComponent.name);
  elem.appendChild(webComponent);
}
function unmount() {
  document.querySelectorAll(PuppyComponent.name).forEach(function (component) {
    return component.remove();
  });
}
;// CONCATENATED MODULE: ../component-2/index.js
function component_2_typeof(obj) { "@babel/helpers - typeof"; return component_2_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, component_2_typeof(obj); }

function component_2_regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ component_2_regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return generator._invoke = function (innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; }(innerFn, self, context), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == component_2_typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; this._invoke = function (method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); }; } function maybeInvokeDelegate(delegate, context) { var method = delegate.iterator[context.method]; if (undefined === method) { if (context.delegate = null, "throw" === context.method) { if (delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel; context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method"); } return ContinueSentinel; } var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) { if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; } return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (object) { var keys = []; for (var key in object) { keys.push(key); } return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) { "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); } }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }

function component_2_asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function component_2_asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { component_2_asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { component_2_asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function component_2_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function component_2_createClass(Constructor, protoProps, staticProps) { if (protoProps) component_2_defineProperties(Constructor.prototype, protoProps); if (staticProps) component_2_defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function component_2_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function component_2_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) component_2_setPrototypeOf(subClass, superClass); }

function component_2_createSuper(Derived) { var hasNativeReflectConstruct = component_2_isNativeReflectConstruct(); return function _createSuperInternal() { var Super = component_2_getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = component_2_getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return component_2_possibleConstructorReturn(this, result); }; }

function component_2_possibleConstructorReturn(self, call) { if (call && (component_2_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return component_2_assertThisInitialized(self); }

function component_2_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function component_2_wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; component_2_wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !component_2_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return component_2_construct(Class, arguments, component_2_getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return component_2_setPrototypeOf(Wrapper, Class); }; return component_2_wrapNativeSuper(Class); }

function component_2_construct(Parent, args, Class) { if (component_2_isNativeReflectConstruct()) { component_2_construct = Reflect.construct; } else { component_2_construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) component_2_setPrototypeOf(instance, Class.prototype); return instance; }; } return component_2_construct.apply(null, arguments); }

function component_2_isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function component_2_isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function component_2_setPrototypeOf(o, p) { component_2_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return component_2_setPrototypeOf(o, p); }

function component_2_getPrototypeOf(o) { component_2_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return component_2_getPrototypeOf(o); }

function component_2_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function component_2_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? component_2_ownKeys(Object(source), !0).forEach(function (key) { component_2_defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : component_2_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function component_2_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

 // should import es modules, should allow code-splitting
// const nrConfig = {
//   applicationID: 35094708,
//   licenseKey: '2fec6ab188',
//   beacon: 'staging-bam-cell.nr-data.net',
//   jserrors: { harvestTimeSeconds: 5 }
// }

var component_2_nrConfig = component_2_objectSpread(component_2_objectSpread(component_2_objectSpread(component_2_objectSpread({}, NREUM.init), NREUM.info), NREUM.loader_config), {}, {
  // licenseKey: 'asdf',
  applicationID: 2
});

var component_2_nr = new BrowserAgent(); // Create a new instance of the Browser Agent

component_2_nr.features.errors.auto = false; // Disable auto instrumentation (full page)

component_2_nr.start(component_2_nrConfig).then(function () {
  console.debug("agent initialized! -- Kitten Component");
});

var KittenComponent = /*#__PURE__*/function (_HTMLElement) {
  component_2_inherits(KittenComponent, _HTMLElement);

  var _super = component_2_createSuper(KittenComponent);

  function KittenComponent() {
    var _this;

    component_2_classCallCheck(this, KittenComponent);

    _this = _super.call(this);

    component_2_defineProperty(component_2_assertThisInitialized(_this), "fetchImg", /*#__PURE__*/component_2_asyncToGenerator( /*#__PURE__*/component_2_regeneratorRuntime().mark(function _callee() {
      var params, url, resp, json, result;
      return component_2_regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              params = {
                api_key: 'TMWFkdtKTv6To8CjL9OqC2KBNQTM8D3N',
                q: 'kitten',
                limit: 100
              };
              url = new URL("https://api.giphy.com/v1/gifs/search");
              Object.keys(params).forEach(function (key) {
                return url.searchParams.append(key, params[key]);
              });
              _context.next = 5;
              return fetch(url);

            case 5:
              resp = _context.sent;
              _context.next = 8;
              return resp.json();

            case 8:
              json = _context.sent;
              result = json.data.length > 0 ? json.data[Math.floor(Math.random() * json.data.length)].images.downsized.url : 'https://media.giphy.com/media/3zhxq2ttgN6rEw8SDx/giphy.gif';
              return _context.abrupt("return", result);

            case 11:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    })));

    component_2_defineProperty(component_2_assertThisInitialized(_this), "setImg", /*#__PURE__*/component_2_asyncToGenerator( /*#__PURE__*/component_2_regeneratorRuntime().mark(function _callee2() {
      var img;
      return component_2_regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return _this.fetchImg();

            case 2:
              img = _context2.sent;
              _this.elem.src = img;
              _this.elem.style.maxWidth = "100vw";
              _this.elem.style.maxHeight = '250px';

              _this.shadow.appendChild(_this.elem);

              _this.sendError();

            case 8:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    })));

    component_2_defineProperty(component_2_assertThisInitialized(_this), "sendError", function () {
      console.debug("NOTICING (nr.noticeError()) an error in ".concat(_this.name));
      var err = new Error("nr.noticeError() called in ".concat(_this.name, " (Component-2)!"));
      component_2_nr.noticeError(err); // throw new Error(`${this.name} called nr.noticeError() then intentionally threw this GLOBAL error!`)
    });

    _this.shadow = _this.attachShadow({
      mode: 'open'
    });
    _this.elem = document.createElement('img');
    _this.name = 'Kitten Component';

    _this.setImg();

    return _this;
  }

  return component_2_createClass(KittenComponent);
}( /*#__PURE__*/component_2_wrapNativeSuper(HTMLElement));

component_2_defineProperty(KittenComponent, "name", 'kitten-component');

customElements.define(KittenComponent.name, KittenComponent);
function component_2_mount(elem) {
  var webComponent = document.createElement(KittenComponent.name);
  elem.appendChild(webComponent);
}
function component_2_unmount() {
  document.querySelectorAll(KittenComponent.name).forEach(function (component) {
    return component.remove();
  });
}
;// CONCATENATED MODULE: ./index.js
function index_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function index_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? index_ownKeys(Object(source), !0).forEach(function (key) { index_defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : index_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function index_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var index_nrConfig = index_objectSpread(index_objectSpread(index_objectSpread(index_objectSpread({}, NREUM.init), NREUM.info), NREUM.loader_config), {}, {
  applicationID: 3
}); // this should notice global errors


var index_nr = new BrowserAgent();
index_nr.start(index_nrConfig);


component_2_mount(document.querySelector("#content"));
mount(document.querySelector("#content"));
document.querySelector("#dogs").addEventListener("click", function () {
  component_2_unmount();
  mount(document.querySelector("#content"));
});
document.querySelector("#cats").addEventListener("click", function () {
  unmount();
  component_2_mount(document.querySelector("#content"));
}); // setTimeout(() => {
//     const tbl = {}
//     Object.entries(NREUM.initializedAgents).forEach(([key, values]) => {
//         const autoInstrument = key === nr.id
//         tbl[key] = {features: values.features.join(", ") || null, applicationID: values.info.applicationID, autoInstrument}
//     })
//     console.table(tbl)
// }, 500)
}();
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=build-time-mfe.js.map