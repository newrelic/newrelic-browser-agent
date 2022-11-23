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

/** Do not use this within the worker context. */
export function windowAddEventListener(event, listener) {
  window.addEventListener(event, listener, eventListenerOpts(false));
}
/** Do not use this within the worker context. */
export function documentAddEventListener(event, listener) {
  document.addEventListener(event, listener, eventListenerOpts(false));
}