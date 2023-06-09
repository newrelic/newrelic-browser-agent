import { globalScope } from '../constants/runtime'

/*
 * See https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#safely_detecting_option_support
 */
let passiveSupported = false
let signalSupported = false
try {
  const options = {
    get passive () { // this function will be called when the browser attempts to access the passive property
      passiveSupported = true
      return false
    },
    get signal () {
      signalSupported = true
      return false
    }
  }

  globalScope.addEventListener('test', null, options)
  globalScope.removeEventListener('test', null, options)
} catch (err) {}

export function eventListenerOpts (useCapture, abortSignal) {
  return (passiveSupported || signalSupported)
    ? {
        capture: !!useCapture,
        passive: passiveSupported, // passive defaults to false
        signal: abortSignal
      }
    : !!useCapture // mainly just IE11 doesn't support third param options under EventTarget API
}

/** Do not use this within the worker context. */
export function windowAddEventListener (event, listener, capture = false, abortSignal) {
  window.addEventListener(event, listener, eventListenerOpts(capture, abortSignal))
}
/** Do not use this within the worker context. */
export function documentAddEventListener (event, listener, capture = false, abortSignal) {
  document.addEventListener(event, listener, eventListenerOpts(capture, abortSignal))
}
