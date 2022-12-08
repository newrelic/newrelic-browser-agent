var supportsPassive = false
try {
  var opts = Object.defineProperty({}, 'passive', {
    // eslint-disable-next-line
    get: function() {
      supportsPassive = true
    }
  })
  self.addEventListener('testPassive', null, opts)
  self.removeEventListener('testPassive', null, opts)
} catch (e) {
  // do nothing
}

export function eventListenerOpts(useCapture) {
  return supportsPassive ? {passive: true, capture: !!useCapture} : !!useCapture
}