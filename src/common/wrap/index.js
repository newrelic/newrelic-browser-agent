/**
 * @file Wraps assorted native objects and functions for instrumentation.
 */

import { wrapFetch } from './wrap-fetch'
import { wrapTimer } from './wrap-timer'
import { wrapRaf } from './wrap-raf'
import { wrapHistory } from './wrap-history'
import { wrapJsonP } from './wrap-jsonp'
import { wrapMutation } from './wrap-mutation'
import { wrapPromise } from './wrap-promise'
import { wrapXhr } from './wrap-xhr'
import { wrapEvents } from './wrap-events'

export {
  wrapEvents, wrapFetch, wrapHistory, wrapJsonP, wrapMutation, wrapPromise, wrapRaf, wrapTimer, wrapXhr
}
