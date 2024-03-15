/**
 * @file Wraps assorted native objects and functions for instrumentation.
 */

import { wrapEvents } from './wrap-events'
import { wrapFetch } from './wrap-fetch'
import { wrapHistory } from './wrap-history'
import { wrapJsonP } from './wrap-jsonp'
import { wrapMutation } from './wrap-mutation'
import { wrapPromise } from './wrap-promise'
import { wrapTimer } from './wrap-timer'
import { wrapXhr } from './wrap-xhr'

export {
  wrapEvents, wrapFetch, wrapHistory, wrapJsonP, wrapMutation, wrapPromise, wrapTimer, wrapXhr
}
