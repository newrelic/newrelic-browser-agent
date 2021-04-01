module.exports = function interval (fn, ms) {
  setTimeout(function tick () {
    try {
      fn()
    } finally {
      setTimeout(tick, ms)
    }
  }, ms)
}
