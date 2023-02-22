/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * This module is used by: spa
 */
import { createWrapperWithEmitter as wrapFn, flag, unwrapFunction } from './wrap-function'
import { ee as baseEE, getOrSetContext } from '../event-emitter/contextual-ee'
import { originals } from '../config/config'
import { globalScope } from '../util/global-scope'

const wrapped = {}

export function wrapPromise (sharedEE) {
  const promiseEE = scopedEE(sharedEE)

  if (wrapped[promiseEE.debugId])
  { return promiseEE }
  wrapped[promiseEE.debugId] = true

  var getContext = getOrSetContext
  var promiseWrapper = wrapFn(promiseEE)
  var prevPromiseObj = originals.PR

  if (prevPromiseObj) { // ensure there's a Promise API (native or otherwise) to even wrap
    wrap()
  }

  function wrap () {
    globalScope.Promise = WrappedPromise

    // Renamed from "WrappedPromise" back to "Promise" & toString() so that we appear "native" to TP libraries...
    Object.defineProperty(WrappedPromise, 'name', {
      value: 'Promise'
    })
    WrappedPromise.toString = function () { return prevPromiseObj.toString() }

    /**
     * This constitutes the global used when calling "Promise.staticMethod" or chaining off a "new Promise()" object.
     * @param {Function} executor - to be executed by the original Promise constructor
     * @returns A new WrappedPromise object prototyped off the original.
     */
    function WrappedPromise (executor) {
      var ctx = promiseEE.context()
      var wrappedExecutor = promiseWrapper(executor, 'executor-', ctx, null, false)

      const newCustomPromiseInst = Reflect.construct(prevPromiseObj, [wrappedExecutor], WrappedPromise) // new Promises will use WrappedPromise.prototype as theirs prototype

      promiseEE.context(newCustomPromiseInst).getCtx = function () {
        return ctx
      }
      return newCustomPromiseInst
    }

    // Make WrappedPromise inherit statics from the orig Promise.
    Object.setPrototypeOf(WrappedPromise, prevPromiseObj);

    ['all', 'race'].forEach(function (method) {
      const prevStaticFn = prevPromiseObj[method]
      WrappedPromise[method] = function (subPromises) { // use our own wrapped version of "Promise.all" and ".race" static fns
        let finalized = false
        subPromises?.forEach(sub => {
          // eslint-disable-next-line
          this.resolve(sub).then(setNrId(method === 'all'), setNrId(false));
        })

        const origFnCallWithThis = prevStaticFn.apply(this, arguments)
        return origFnCallWithThis

        function setNrId (overwrite) {
          return function () {
            promiseEE.emit('propagate', [null, !finalized], origFnCallWithThis, false, false)
            finalized = finalized || !overwrite
          }
        }
      }
    });
    ['resolve', 'reject'].forEach(function (method) {
      const prevStaticFn = prevPromiseObj[method]
      WrappedPromise[method] = function (val) { // and the same for ".resolve" and ".reject"
        const origFnCallWithThis = prevStaticFn.apply(this, arguments)

        if (val !== origFnCallWithThis) {
          promiseEE.emit('propagate', [val, true], origFnCallWithThis, false, false)
        }
        return origFnCallWithThis
      }
    })

    /*
     * Ideally, we create a new WrappedPromise.prototype chained off the original Promise's so that we don't alter it.
     * However, there's no way to make the (native) promise returned from async functions use our WrappedPromise,
     * so we have to modify the original prototype in essence. This ensures that "async()"" promise functions and runs the
     * same instance methods as "new Promise()", and also that instanceof async() is the global Promise (see GH issue #409).
     *  In addition, this affects the fetch() promise too.
     */
    WrappedPromise.prototype = prevPromiseObj.prototype

    // Note that this wrapping affects the same originals.PR (prototype) object.
    const prevPromiseOrigThen = prevPromiseObj.prototype.then
    prevPromiseObj.prototype.then = function wrappedThen (...args) {
      var originalThis = this
      var ctx = getContext(originalThis)
      ctx.promise = originalThis
      args[0] = promiseWrapper(args[0], 'cb-', ctx, null, false)
      args[1] = promiseWrapper(args[1], 'cb-', ctx, null, false)

      const origFnCallWithThis = prevPromiseOrigThen.apply(this, args)

      ctx.nextPromise = origFnCallWithThis
      promiseEE.emit('propagate', [originalThis, true], origFnCallWithThis, false, false)

      return origFnCallWithThis
    }
    prevPromiseObj.prototype.then[flag] = prevPromiseOrigThen

    promiseEE.on('executor-start', function (args) {
      args[0] = promiseWrapper(args[0], 'resolve-', this, null, false)
      args[1] = promiseWrapper(args[1], 'resolve-', this, null, false)
    })

    promiseEE.on('executor-err', function (args, originalThis, err) {
      args[1](err)
    })

    promiseEE.on('cb-end', function (args, originalThis, result) {
      promiseEE.emit('propagate', [result, true], this.nextPromise, false, false)
    })

    promiseEE.on('propagate', function (val, overwrite, trigger) {
      if (!this.getCtx || overwrite) {
        this.getCtx = function () {
          // eslint-disable-next-line
          if (val instanceof Promise) {
            var store = promiseEE.context(val)
          }

          return store && store.getCtx ? store.getCtx() : this
        }
      }
    })
  }
  return promiseEE
}
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('promise')
}
