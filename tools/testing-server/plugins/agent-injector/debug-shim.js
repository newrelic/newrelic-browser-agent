/**
 * This script is injected into test HTML pages when debug is enabled. This script
 * MUST support the oldest browser we test (IE@11). DO NOT use ES6 syntax or unsupported
 * EXCMAScript standards.
 */
module.exports = `
  ;window.NRDEBUG = (function() {
    var count = 0;
    return nrdebug;
    function nrdebug(msg, sync) {
      count++;
      if (typeof msg === 'object') {
        msg = JSON.stringify(msg)
      }
      var url = 'http://' + NREUM.info.beacon + '/debug?m=' + escape(msg) + '&testId=' + NREUM.info.licenseKey + '&r=' + Math.random() + '&ix=' + count
      if (!sync) {
        var img = new window.Image()
        img.src = url
        return img
      } else {
        var request = new XMLHttpRequest()
        request.open('POST', url, false)
        request.setRequestHeader('content-type', 'text/plain')
        request.send()
      }
    };
  })()
  var origOnError = window.onerror
  window.onerror = function() {
    NRDEBUG(\`error thrown: \${JSON.stringify(arguments)}\`)
    origOnError(arguments)
  }
  var origLog = window.console.log
  window.console.log = function() {
    NRDEBUG(\`console.log: \${JSON.stringify(arguments)}\`)
    origLog(arguments)
  }
  var origWarn = window.console.warn
  window.console.warn = function() {
    NRDEBUG(\`console.warn: \${JSON.stringify(arguments)}\`)
    origWarn(arguments)
  }
  var origErr = window.console.error
  window.console.error = function() {
    NRDEBUG(\`console.error: \${JSON.stringify(arguments)}\`)
    origErr(arguments)
  }
`
