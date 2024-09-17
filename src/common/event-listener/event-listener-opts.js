export function eventListenerOpts (useCapture, abortSignal) {
  return {
    capture: useCapture,
    passive: false,
    signal: abortSignal
  }
}

/** Do not use this within the worker context. */
export function windowAddEventListener (event, listener, capture = false, abortSignal) {
  window.addEventListener(event, listener, eventListenerOpts(capture, abortSignal))
}
/** Do not use this within the worker context. */
export function documentAddEventListener (event, listener, capture = false, abortSignal) {
  document.addEventListener(event, listener, eventListenerOpts(capture, abortSignal))
}
