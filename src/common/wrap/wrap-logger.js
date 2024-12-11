/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Wraps native timeout and interval methods for instrumentation.
 * This module is used by: jserrors, spa.
 */

import { ee as baseEE, contextId } from '../event-emitter/contextual-ee'
import { EventContext } from '../event-emitter/event-context'
import { warn } from '../util/console'
import { flag, createWrapperWithEmitter as wfn } from './wrap-function'

const contextMap = new Map()

/**
 * Wraps a supplied function and adds emitter events under the `-wrap-logger-` prefix
 * @param {Object} sharedEE - The shared event emitter on which a new scoped event emitter will be based.
 * @param {Object} parent - The parent object housing the logger function
 * @param {string} loggerFn - The name of the function in the parent object to wrap
 * @returns {Object} Scoped event emitter with a debug ID of `logger`.
 */
// eslint-disable-next-line
export function wrapLogger(sharedEE, parent, loggerFn, context) {
  if (!(typeof parent === 'object' && !!parent && typeof loggerFn === 'string' && !!loggerFn && typeof parent[loggerFn] === 'function')) return warn(29)
  const ee = scopedEE(sharedEE)
  const wrapFn = wfn(ee)

  /**
   * This section contains the context that will be shared across all invoked calls of the wrapped function,
   * which will be used to decorate the log data later at agg time
  */
  const ctx = new EventContext(contextId)
  ctx.level = context.level
  ctx.customAttributes = context.customAttributes

  const contextLookupKey = parent[loggerFn]?.[flag] || parent[loggerFn]
  contextMap.set(contextLookupKey, ctx)

  /** observe calls to <loggerFn> and emit events prefixed with `wrap-logger-` */
  wrapFn.inPlace(parent, [loggerFn], 'wrap-logger-', () => contextMap.get(contextLookupKey))

  return ee
}

/**
 * Returns an event emitter scoped specifically for the `logger` context. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter.
 *     Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'logger'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('logger')
}
