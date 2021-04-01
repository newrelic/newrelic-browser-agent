;(function timeoutCallback () {
  window.setTimeout(function () {
    window.setTimeoutFired = true
    throw new Error('timeout callback')
  }, 0)
})()
