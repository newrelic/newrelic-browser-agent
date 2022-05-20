
import {wrapFetch as wf} from './wrap-fetch'
import {wrapTimer as wt} from './wrap-timer'
import {wrapRaf as wr} from './wrap-raf'
import {wrapHistory as wh} from './wrap-history'
import {wrapJsonP as wj} from './wrap-jsonp'
import {wrapMutation as wm} from './wrap-mutation'
import {wrapPromise as wp} from './wrap-promise'
import {wrapXhr as wx} from './wrap-xhr'
import {wrapEvents as we} from './wrap-events'

export {wrapGlobal as wrapGlobalFetch} from './wrap-fetch'

export function wrapEvents(sharedEE) {
  return we(sharedEE)
}

export function wrapFetch(sharedEE) {
  return wf(sharedEE)
}

export function wrapHistory(sharedEE) {
  return wh(sharedEE)
}

export function wrapJson(sharedEE) {
  return wj(sharedEE)
}

export function wrapMutation(sharedEE) {
  return wm(sharedEE)
}

export function wrapPromise(sharedEE) {
  return wp(sharedEE)
}

export function wrapRaf(sharedEE) {
  return wr(sharedEE)
}

export function wrapTimer(sharedEE) {
  return wt(sharedEE)
}

export function wrapXhr(sharedEE) {
  return wx(sharedEE)
}
