
// if (!window.NREUM) {
//   window.NREUM = {}
// }

// if (!window.NREUM.o) {
//   var win = window
//   // var doc = win.document
//   var XHR = win.XMLHttpRequest

//   NREUM.o = {
//     ST: setTimeout,
//     SI: win.setImmediate,
//     CT: clearTimeout,
//     XHR: XHR,
//     REQ: win.Request,
//     EV: win.Event,
//     PR: win.Promise,
//     MO: win.MutationObserver,
//     FETCH: win.fetch
//   }
// }

// export default {
//   wrapGlobalEvents: wrapGlobalEvents,
//   wrapGlobalFetch: wrapGlobalFetch,
//   wrapGlobalRaf: wrapRaf,
//   wrapGlobalTimers: wrapTimer,
//   wrapXhr: wrapXhr,
//   wrapFetch: wrapFetch
// }

export function wrapGlobalEvents() {
  import('./wrap-events')
}

export function wrapGlobalFetch() {
  return import('./wrap-fetch').then(module => module.wrapGlobal())
}

export function wrapFetch(ee) {
  return import('./wrap-fetch').then(module => module.wrap(ee))
}

export function wrapHistory() {
  import('./wrap-history')
}

export function wrapJson() {
  import('./wrap-jsonp')
}

export function wrapMutation() {
  import('./wrap-mutation')
}

export function wrapPromise() {
  import('./wrap-promise')
}

export function wrapRaf() {
  import('./wrap-raf')
}

export function wrapTimer() {
  import('./wrap-timer')
}

export function wrapXhr() {
  import('./wrap-xhr')
}
