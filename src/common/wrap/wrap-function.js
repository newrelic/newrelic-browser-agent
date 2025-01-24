/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Provides helper functions for wrapping functions in various scenarios.
 */

import { ee } from '../event-emitter/contextual-ee'
import { bundleId } from '../ids/bundle-id'

export const flag = `nr@original:${bundleId}`

/**
 * A convenience alias of `hasOwnProperty`.
 * @type {function}
 */
var has = Object.prototype.hasOwnProperty

/**
 * For tracking whether an event is already being emitted inside the wrapper.
 * @type {boolean}
 */
var inWrapper = false

// eslint-disable-next-line
export default createWrapperWithEmitter

/**
 * Wraps a function in order to emit events on start, end, and error.
 * @param {Object} [emitter] - The desired emitter for events emitted by the wrapper. Defaults to the global emitter.
 * @param {boolean} always - If `true`, emit events even if already emitting an event.
 * @returns {function} The wrapped function.
 */
export function createWrapperWithEmitter (emitter, always) {
  emitter || (emitter = ee)

  wrapFn.inPlace = inPlace

  /**
   * A flag used to determine if a native function has already been wrapped.
   * As a property on a wrapped function, contains the original function.
   * @type {string}
   */
  wrapFn.flag = flag

  return wrapFn

  /**
   * Wraps a function with event emitting functionality.
   * @param {function} fn - The function to wrap.
   * @param {string} prefix - A prefix for the names of emitted events.
   * @param {function|object} getContext - The function or object that will serve as the 'this' context for handlers of events emitted by this wrapper.
   * @param {string} methodName - The name of the method being wrapped.
   * @param {boolean} bubble - If true, emitted events should also bubble up to the old emitter upon which the `emitter` in the current scope was based (if it defines one).
   * @returns {function} The wrapped function.
   */
  function wrapFn (fn, prefix, getContext, methodName, bubble) {
    // Unless fn is both wrappable and unwrapped, return it unchanged.
    if (notWrappable(fn)) return fn

    if (!prefix) prefix = ''

    nrWrapper[flag] = fn
    copy(fn, nrWrapper, emitter)
    return nrWrapper

    /**
     * A wrapper function that emits events before and after calling the wrapped function.
     * Any arguments will be passed along to the original function.
     * @returns {any} The return value of the wrapped function.
     */
    function nrWrapper () {
      var args
      var originalThis
      var ctx
      var result

      try {
        originalThis = this
        args = [...arguments]

        if (typeof getContext === 'function') {
          ctx = getContext(args, originalThis)
        } else {
          ctx = getContext || {}
        }
      } catch (e) {
        report([e, '', [args, originalThis, methodName], ctx], emitter)
      }

      // Warning: start events may mutate args!
      safeEmit(prefix + 'start', [args, originalThis, methodName], ctx, bubble)

      try {
        result = fn.apply(originalThis, args)
        return result
      } catch (err) {
        safeEmit(prefix + 'err', [args, originalThis, err], ctx, bubble)

        // rethrow error so we don't effect execution by observing.
        throw err
      } finally {
        // happens no matter what.
        safeEmit(prefix + 'end', [args, originalThis, result], ctx, bubble)
      }
    }
  }

  /**
   * Creates wrapper functions around each of an array of methods on a specified object.
   * @param {Object} obj The object to which the specified methods belong.
   * @param {string[]} methods An array of method names to be wrapped.
   * @param {string} [prefix=''] A prefix to add to the names of emitted events. If `-` is the first character, also
   * adds the method name before the prefix.
   * @param {function|object} [getContext] The function or object that will serve as the 'this' context for handlers
   * of events emitted by this wrapper.
   * @param {boolean} [bubble=false] If `true`, emitted events should also bubble up to the old emitter upon which
   * the `emitter` in the current scope was based (if it defines one).
   */
  function inPlace (obj, methods, prefix, getContext, bubble) {
    if (!prefix) prefix = ''

    // If prefix starts with '-' set this boolean to add the method name to the prefix before passing each one to wrap.
    const prependMethodPrefix = (prefix.charAt(0) === '-')

    for (let i = 0; i < methods.length; i++) {
      const method = methods[i]
      const fn = obj[method]

      // Unless fn is both wrappable and unwrapped, bail so we don't add extra properties with undefined values.
      if (notWrappable(fn)) continue

      obj[method] = wrapFn(fn, (prependMethodPrefix ? method + prefix : prefix), getContext, method, bubble)
    }
  }

  /**
   * Emits an event using the `emit` method of the `emitter` object in the executing scope, but only if an event is not
   * already being emitted (except when the executing scope defines `always` as `true`).
   * @param {string} evt - The name of the event to be emitted.
   * @param {array} arr - An array of arguments to pass with the event.
   * @param {Object} store - The function or object that will serve as the 'this'
   *     context when applying handler functions for this event.
   * @param {boolean} bubble - If `true`, emitted events should also
   *     bubble up to the old emitter upon which the `emitter` in the
   *     executing scope was based (if it defines one).
   */
  function safeEmit (evt, arr, store, bubble) {
    if (inWrapper && !always) return
    var prev = inWrapper
    inWrapper = true
    try {
      emitter.emit(evt, arr, store, always, bubble)
    } catch (e) {
      report([e, evt, arr, store], emitter)
    }
    inWrapper = prev
  }
}

/**
 * Emits an "internal-error" event. Used to report errors encountered when emitting events using `safeEmit`.
 * @param {array} args - Arguments to be passed to the "internal-error" event.
 * @param {Object} [emitter] - The (optional) desired event emitter. Defaults to the global event emitter.
 */
function report (args, emitter) {
  emitter || (emitter = ee)
  try {
    emitter.emit('internal-error', args)
  } catch (err) {
    // do nothing
  }
}

/**
 * Copies properties from one object to another. Used for creating a wrapper function from an original function and for
 * copying an original function to a property of a wrapper function named by `flag` in the executing context.
 * @param {Object} from - The source function or object.
 * @param {Object} to - The destination function or object.
 * @param {Object} [emitter] - The (optional) desired event emitter if errors are encountered while copying.
 *     Defaults to the global event emitter.
 * @returns {object} - The destination founction or object with copied properties.
 */
function copy (from, to, emitter) {
  if (Object.defineProperty && Object.keys) {
    // Create accessors that proxy to actual function
    try {
      var keys = Object.keys(from)
      // eslint-disable-next-line
      keys.forEach(function (key) {
        Object.defineProperty(to, key, {
          get: function () { return from[key] },
          // eslint-disable-next-line
          set: function (val) { from[key] = val; return val }
        })
      })
      return to
    } catch (e) {
      report([e], emitter)
    }
  }
  // fall back to copying properties
  for (var i in from) {
    if (has.call(from, i)) {
      to[i] = from[i]
    }
  }
  return to
}

/**
 * Determines whether a function is eligible to be wrapped in part based on whether it has already been wrapped.
 * @param {function} fn - The function in question.
 * @returns {boolean} Whether the passed function is ineligible to be wrapped.
 */
function notWrappable (fn) {
  return !(fn && typeof fn === 'function' && fn.apply && !fn[flag])
}
