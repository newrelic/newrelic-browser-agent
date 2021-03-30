;(function intervalCallback () {
  var timer = window.setInterval(function () {
    window.clearInterval(timer)
    window.intervalFired = true
    throw new Error('interval callback')
  }, 0)
})()
