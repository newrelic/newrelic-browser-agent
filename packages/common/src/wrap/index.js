
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

import {wrap} from './wrap-fetch'
import wt from './wrap-timer'
import wr from './wrap-raf'
import wh from './wrap-history'
import wj from './wrap-jsonp'
import wm from './wrap-mutation'
import wp from './wrap-promise'
import wx from './wrap-xhr'
import we from './wrap-events'

export {wrapGlobal as wrapGlobalFetch} from './wrap-fetch'

export function wrapGlobalEvents() {
  return we
}

export function wrapFetch(ee) {
  // return import('./wrap-fetch').then(module => module.wrap(ee))
  wrap(ee)
}

export function wrapHistory() {
  return wh
}

export function wrapJson() {
  return wj
}

export function wrapMutation() {
  return wm
}

export function wrapPromise() {
  return wp
}

export function wrapRaf() {
  return wr
}

export function wrapTimer() {
  return wt
}

export function wrapXhr() {
  return wx
}
