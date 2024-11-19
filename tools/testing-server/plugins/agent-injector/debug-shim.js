/**
 * This script is injected into test HTML pages when debug is enabled. This script
 * MUST support the oldest browser we test (IE@11). DO NOT use ES6 syntax or unsupported
 * EXCMAScript standards.
 */
module.exports = `
  ;window.NRDEBUG_LOGS=[]
  ;window.NRDEBUG = (function() {
    var count = 0;
    return nrdebug;
    function nrdebug(msg, sync) {
      count++;
      if (typeof msg === 'object') {
        msg = JSON.stringify(msg)
      }
      window.NRDEBUG_LOGS.push({timestamp: performance?.now(), msg, url: window?.location?.href});
    };
  })()
  var origOnError = window.onerror
  window.onerror = function() {
    NRDEBUG('error thrown: ' + JSON.stringify(arguments))
    if (typeof origOnError === 'function') {
      origOnError(arguments)
    }
  }
  var origLog = window.console.log.bind(window.console)
  window.console.log = function() {
    NRDEBUG('console.log: ' + JSON.stringify(arguments))
    if (typeof origLog === 'function') {
      origLog(arguments)
    }
  }
  var origWarn = window.console.warn.bind(window.console)
  window.console.warn = function() {
    NRDEBUG('console.warn: ' + JSON.stringify(arguments))
    if (typeof origWarn === 'function') {
      //origWarn(arguments)
    }
  }
  var origErr = window.console.error.bind(window.console)
  window.console.error = function() {
    NRDEBUG('console.error: ' + JSON.stringify(arguments))
    if (typeof origErr === 'function') {
      origErr(arguments)
    }
  }
  var origTrace = window.console.trace.bind(window.console)
  window.console.trace = function() {
    NRDEBUG('console.trace: ' + JSON.stringify(arguments))
    if (typeof origTrace === 'function') {
      origTrace(arguments)
    }
  }
`
