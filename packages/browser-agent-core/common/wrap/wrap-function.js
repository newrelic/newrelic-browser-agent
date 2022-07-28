/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {ee} from '../event-emitter/contextual-ee'
import slice from 'lodash._slice'
var flag = 'nr@original'
var has = Object.prototype.hasOwnProperty
var inWrapper = false

// eslint-disable-next-line
export default createWrapperWithEmitter

export function createWrapperWithEmitter(emitter, always) {
  emitter || (emitter = ee)

  wrapFn.inPlace = inPlace
  wrapFn.flag = flag

  return wrapFn

  function wrapFn (fn, prefix, getContext, methodName, bubble) {
    // Unless fn is both wrappable and unwrapped, return it unchanged.
    if (notWrappable(fn)) return fn

    if (!prefix) prefix = ''

    nrWrapper[flag] = fn
    copy(fn, nrWrapper, emitter)
    return nrWrapper

    function nrWrapper () {
      var args
      var originalThis
      var ctx
      var result

      try {
        originalThis = this
        args = slice(arguments)

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

  function inPlace (obj, methods, prefix, getContext, bubble) {
    if (!prefix) prefix = ''
    // If prefix starts with '-' set this boolean to add the method name to
    // the prefix before passing each one to wrap.
    var prependMethodPrefix = (prefix.charAt(0) === '-')
    var fn
    var method
    var i

    for (i = 0; i < methods.length; i++) {
      method = methods[i]
      fn = obj[method]

      // Unless fn is both wrappable and unwrapped bail,
      // so we don't add extra properties with undefined values.
      if (notWrappable(fn)) continue

      obj[method] = wrapFn(fn, (prependMethodPrefix ? method + prefix : prefix), getContext, method, bubble)
    }
  }

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

function report (args, emitter) {
  emitter || (emitter = ee)
  try {
    emitter.emit('internal-error', args)
  } catch (err) {
    // do nothing
  }
}

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

function notWrappable (fn) {
  return !(fn && fn instanceof Function && fn.apply && !fn[flag])
}

export function wrapFunction(fn, wrapper) {
  var wrapped = wrapper(fn)
  wrapped[flag] = fn
  copy(fn, wrapped, ee)
  return wrapped
}

export function wrapInPlace(obj, fnName, wrapper) {
  var fn = obj[fnName]
  obj[fnName] = wrapFunction(fn, wrapper)
}

export function argsToArray() {
  var len = arguments.length
  var arr = new Array(len)
  for (var i = 0; i < len; ++i) {
    arr[i] = arguments[i]
  }
  return arr
}
