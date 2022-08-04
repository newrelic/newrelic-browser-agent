var supportsPassive = false
try {
  var opts = Object.defineProperty({}, 'passive', {
    // eslint-disable-next-line
    get: function() {
      supportsPassive = true
    }
  })
  window.addEventListener('testPassive', null, opts)
  window.removeEventListener('testPassive', null, opts)
} catch (e) {
  // do nothing
}

export function eventListenerOpts(useCapture) {
  return supportsPassive ? {passive: true, capture: !!useCapture} : !!useCapture
}