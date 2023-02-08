import { globalScope } from "../util/global-scope";

var supportsPassive = false;
try {
  var opts = Object.defineProperty({}, "passive", {
    // eslint-disable-next-line
    get: function () {
      supportsPassive = true;
    },
  });
  globalScope?.addEventListener("testPassive", null, opts);
  globalScope?.removeEventListener("testPassive", null, opts);
} catch (e) {
  // do nothing
}

export function eventListenerOpts(useCapture) {
  return supportsPassive ? { passive: true, capture: !!useCapture } : !!useCapture;
}

/** Do not use this within the worker context. */
export function windowAddEventListener(event, listener, capture = false) {
  window.addEventListener(event, listener, eventListenerOpts(capture));
}
/** Do not use this within the worker context. */
export function documentAddEventListener(event, listener, capture = false) {
  document.addEventListener(event, listener, eventListenerOpts(capture));
}
