/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint no-console: ["error", { allow: ["debug"] }] */

import { gosNREUMOriginals } from '../window/nreum'
import { getOrSet } from '../util/get-or-set'

const instrumented = new WeakSet()
const debugListenerFlag = 'nr@debugListener'

/**
 * Logs via the native, pre-agent `console.debug` reference captured in gosNREUMOriginals (before
 * the logging feature's wrapLogger monkey-patches `console.debug` to auto-capture it as a log
 * event). Using `console.debug` directly here would otherwise cause this debug tooling's own
 * output to get captured and harvested as real log data once the logging feature initializes.
 */
export function debugLog (...args) {
  const original = gosNREUMOriginals().o?.DEBUG
  if (typeof original === 'function') original.apply(console, args)
  else if (typeof console.debug === 'function') console.debug(...args) // fallback if originals weren't captured yet (e.g. called before agent configure())
}

/**
 * Wraps every own method on `proto` so that, when the method is called on an instance with
 * `__nrDebug` set to true, the call and its return value are logged via `console.debug`.
 * Wrapping a given prototype only happens once; the `__nrDebug` check happens per-instance
 * at call time, so instances sharing this prototype are debugged independently of one another.
 * @param {Object} proto
 * @param {string} label
 */
export function instrumentPrototype (proto, label) {
  if (instrumented.has(proto)) return
  instrumented.add(proto)

  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue
    const descriptor = Object.getOwnPropertyDescriptor(proto, key)
    if (!descriptor || typeof descriptor.value !== 'function') continue // skips getters/setters -- reading proto[key] directly would invoke them against the bare prototype
    const original = descriptor.value

    proto[key] = function (...args) {
      if (this.__nrDebug) debugLog(`[${label}] ${key}`, args)
      const result = original.apply(this, args)
      if (this.__nrDebug) debugLog(`[${label}] ${key} ->`, result)
      return result
    }
  }
}

/**
 * Sets `instance.__nrDebug = true` and instruments its class prototype (see instrumentPrototype).
 * Small convenience so classes that want a `.debug(label)` method don't repeat this pairing.
 * @param {Object} instance
 * @param {string} label
 */
export function debugInstance (instance, label) {
  instance.__nrDebug = true
  instrumentPrototype(Object.getPrototypeOf(instance), label)
}

/**
 * Wraps every own function property directly on `obj` (as opposed to `instrumentPrototype`,
 * which wraps a shared class prototype). For plain objects returned by factory functions --
 * e.g. the contextual event emitter, whose methods (`emit`, `on`, ...) are own properties of
 * each unique emitter instance, not prototype methods -- there's no prototype to wrap, and no
 * need for a per-instance flag check since each `obj` passed in is already a distinct instance.
 * Wrapping a given object only happens once; logging starts immediately and unconditionally.
 * @param {Object} obj
 * @param {string} label
 */
export function instrumentObject (obj, label) {
  if (!obj || instrumented.has(obj)) return
  instrumented.add(obj)

  for (const key of Object.keys(obj)) {
    const original = obj[key]
    if (typeof original !== 'function') continue

    obj[key] = function (...args) {
      debugLog(`[${label}] ${key}`, args)
      const result = original.apply(this, args)
      debugLog(`[${label}] ${key} ->`, result)
      return result
    }
  }
}

/**
 * Like instrumentObject, but for the contextual event emitter (contextual-ee.js) specifically:
 * `on`/`addEventListener` are additionally special-cased so the *registered listener function*
 * gets wrapped too (logged when it actually fires from inside emit(), not just when it's
 * registered) -- otherwise you'd only ever see "on was called" / "emit was called", never "this
 * specific handler ran and returned X".
 *
 * This mutates the listener function reference stored in the emitter's internal `handlers` map,
 * so `removeEventListener` symmetry matters: naively replacing `fn` with a new wrapper on every
 * `on()` call would mean a later `removeEventListener(type, originalFn)` -- passing the original,
 * unwrapped reference, as real calling code does -- silently fails to find and remove it. Fixed
 * the same way this codebase's own wrap-events.js does it: the wrapper is stored ON the original
 * function itself (via getOrSet, non-enumerable) so it's always the same wrapper for a given
 * original, and removeEventListener is patched to look it up and remove that instead.
 * @param {Object} ee
 * @param {string} label
 */
export function instrumentEventEmitter (ee, label) {
  if (!ee || instrumented.has(ee)) return
  instrumented.add(ee)

  const originalOn = ee.on
  const originalRemove = ee.removeEventListener

  function wrapListener (type, fn) {
    if (typeof fn !== 'function') return fn
    return getOrSet(fn, debugListenerFlag, () => function (...args) {
      debugLog(`[${label}] on(${type})`, args)
      const result = fn.apply(this, args)
      debugLog(`[${label}] on(${type}) ->`, result)
      return result
    })
  }

  ee.on = ee.addEventListener = function (type, fn) {
    return originalOn.call(this, type, wrapListener(type, fn))
  }

  ee.removeEventListener = function (type, fn) {
    const wrapped = typeof fn === 'function' && Object.prototype.hasOwnProperty.call(fn, debugListenerFlag) ? fn[debugListenerFlag] : fn
    return originalRemove.call(this, type, wrapped)
  }

  for (const key of Object.keys(ee)) {
    if (key === 'on' || key === 'addEventListener' || key === 'removeEventListener') continue
    const original = ee[key]
    if (typeof original !== 'function') continue

    ee[key] = function (...args) {
      debugLog(`[${label}] ${key}`, args)
      const result = original.apply(this, args)
      debugLog(`[${label}] ${key} ->`, result)
      return result
    }
  }
}

/**
 * Taps the codebase's existing DOM addEventListener/removeEventListener wrapping (wrap-events.js,
 * already active whenever session_trace, ajax, or session tracking is enabled -- see
 * session-entity.js and wrap-xhr.js) to log every wrapped listener firing on window/document/XHR.
 * This is the mechanism that makes e.g. jserrors' window 'error'/'unhandledrejection' listeners
 * visible, since those are plain closures registered via addEventListener, not named class
 * methods -- prototype-wrapping alone can never see them.
 *
 * NOTE: this only sees listeners if wrapEvents has already run for this agent (i.e. one of the
 * features above is enabled). If none of them are, there's no scoped emitter to tap and this is a
 * silent no-op -- a real, known gap, not a bug.
 * @param {Object} agentRef
 */
export function instrumentDomListeners (agentRef) {
  const eventsEE = agentRef?.ee?.get?.('events')
  if (!eventsEE || instrumented.has(eventsEE)) return
  instrumented.add(eventsEE)

  const label = `${agentRef.agentIdentifier}:dom-listener`
  eventsEE.on('fn-start', (args, originalThis, methodName) => debugLog(`[${label}] ${methodName}`, args))
  eventsEE.on('fn-end', (args, originalThis, result) => debugLog(`[${label}] listener ->`, result))
  eventsEE.on('fn-err', (args, originalThis, err) => debugLog(`[${label}] listener threw`, err))
}
