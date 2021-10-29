var supportsPassive = false
try {
  var opts = Object.defineProperty({}, 'passive', {
    get: function() {
      supportsPassive = true
    }
  })
  window.addEventListener('testPassive', function() {}, opts)
  window.removeEventListener('testPassive', function() {}, opts)
} catch (e) {}

module.exports = function(useCapture) {
  return supportsPassive ? {passive: true, capture: !!useCapture} : !!useCapture
}
