;(function immediateCallback () {
  if ('setImmediate' in window) {
    window.setImmediate(function () {
      window.setImmediateFired = true
      throw new Error('immediate callback')
    })
  }
})()
