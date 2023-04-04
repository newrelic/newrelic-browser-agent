/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Wraps `debug`, `error`, `info`, `log`, `warn, and `trace` methods of the global `console` object for instrumentation.
 * This module is used by: PageViewEvent.
 */
import { ee as globalEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter } from './wrap-function'
import { globalScope } from '../util/global-scope'

const wrapped = {}
const CONSOLE_METHODS = ['debug', 'error', 'info', 'log', 'warn', 'trace']

/**
 * Wraps the `debug`, `error`, `info`, `log`, `warn, and `trace` methods of global `console` object and returns a
 * corresponding event emitter scoped to the console object.
 * @param {Object} sharedEE - The shared event emitter on which a new scoped event emitter will be based.
 * @returns {Object} Scoped event emitter with a debug ID of `console`.
 */
export function wrapConsole (sharedEE) {
  const ee = scopedEE(sharedEE)

  // We want to wrap console once and only once for each agent instance (`ee.debugId`).
  if (wrapped[ee.debugId]) { return ee }
  wrapped[ee.debugId] = true

  var functionWrapper = createWrapperWithEmitter(ee)
  // Because the console object exists once on the global scope, we don't need to wrap the prototype's methods.
  // We use the global scope instead of window to accomodate service workers.
  // The leading hyphen on '-console-' tells `inPlace` to prefix emitted event names with the method name too.
  functionWrapper.inPlace(globalScope.console, CONSOLE_METHODS, '-console-')

  return ee
}

/**
 * Returns an event emitter scoped specifically for the `console` context. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter.
 *    Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'console'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || globalEE).get('console')
}
