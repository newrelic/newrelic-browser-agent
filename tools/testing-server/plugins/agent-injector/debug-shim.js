/**
 * This script is injected into test HTML pages when debug is enabled. This script
 * MUST support the oldest browser we test (IE@11). DO NOT use ES6 syntax or unsupported
 * EXCMAScript standards.
 */
module.exports = `
  ;window.NRDEBUG_LOGS=[]
  ;window.NRDEBUG = (function() {
    var count = 0;
    var id = Math.random().toString(36).substring(7);
    return nrdebug;
    function nrdebug(msg, method) {
      count++;
      if (typeof msg === 'object') {
        msg = JSON.stringify(msg)
      }
      window.NRDEBUG_LOGS.push({id, timestamp: performance?.now(), msg, url: window?.location?.href, method});
    };
  })()
  var origOnError = window.onerror
  window.onerror = function(...args) {
    NRDEBUG(args, 'window.onerror')
    if (typeof origOnError === 'function') {
      origOnError(arguments)
    }
  }
  var origLog = window.console.log.bind(window.console)
  window.console.log = function(...args) {
    NRDEBUG(args, 'console.log')
    if (typeof origLog === 'function') {
      origLog(arguments)
    }
  }
  var origWarn = window.console.warn.bind(window.console)
  window.console.warn = function(...args) {
    NRDEBUG(args, 'console.warn')
    if (typeof origWarn === 'function') {
      //origWarn(arguments)
    }
  }
  var origErr = window.console.error.bind(window.console)
  window.console.error = function(...args) {
    NRDEBUG(args, 'console.error')
    if (typeof origErr === 'function') {
      origErr(arguments)
    }
  }
  var origTrace = window.console.trace.bind(window.console)
  window.console.trace = function(...args) {
    NRDEBUG(args, 'console.trace')
    if (typeof origTrace === 'function') {
      origTrace(arguments)
    }
  }
`
