/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * This module is used by: spa
 */
 import { createWrapperWithEmitter as wrapFn } from './wrap-function'
 import { ee as baseEE, getOrSetContext } from '../event-emitter/contextual-ee'
 import { originals } from '../config/config'
 import { globalScope } from '../util/global-scope'
 
 const wrapped = {}
 
 export function wrapPromise(sharedEE){
   const promiseEE = scopedEE(sharedEE)
 
   if (wrapped[promiseEE.debugId])
     return promiseEE
   wrapped[promiseEE.debugId] = true
 
   var getContext = getOrSetContext
   var promiseWrapper = wrapFn(promiseEE)
   var prevPromiseObj = originals.PR
 
   if (prevPromiseObj) {  // ensure there's a Promise API (native or otherwise) to even wrap
     wrap()
   }

  function wrap() {
    globalScope.Promise = WrappedPromise;

    // Renamed from "WrappedPromise" back to "Promise" & toString() so that we appear "native" to TP libraries...
    Object.defineProperty(WrappedPromise, 'name', {
      value: 'Promise'
    })
    WrappedPromise.toString = function() { return prevPromiseObj.toString() }

    function WrappedPromise (executor) {
      var ctx = promiseEE.context()
      var wrappedExecutor = promiseWrapper(executor, 'executor-', ctx, null, false)

      const newCustomPromiseInst = Reflect.construct(prevPromiseObj, [wrappedExecutor], WrappedPromise);  // extend the orig Promise constructor as super

      promiseEE.context(newCustomPromiseInst).getCtx = function () {
        return ctx
      }
      return newCustomPromiseInst;
    }
    // Make WrappedPromise inherit statics from the orig Promise.
    Object.setPrototypeOf(WrappedPromise, prevPromiseObj);

    ['all', 'race'].forEach(function (method) {
      const prevStaticFn = prevPromiseObj[method];
      WrappedPromise[method] = function (subPromises) {  // use our own wrapped version of "Promise.all" and ".race" static fns
        let finalized = false;
        subPromises?.forEach(sub => {
          // eslint-disable-next-line
          this.resolve(sub).then(setNrId(method === 'all'), setNrId(false));
        });

        const origFnCallWithThis = prevStaticFn.apply(this, arguments);
        return origFnCallWithThis;

        function setNrId (overwrite) {
          return function () {
            promiseEE.emit('propagate', [null, !finalized], origFnCallWithThis, false, false)
            finalized = finalized || !overwrite
          }
        }
      }
    });

    ['resolve', 'reject'].forEach(function (method) {
      const prevStaticFn = prevPromiseObj[method];
      WrappedPromise[method] = function (val) {  // and the same for ".resolve" and ".reject"
        const origFnCallWithThis = prevStaticFn.apply(this, arguments);

        if (val !== origFnCallWithThis) {
          promiseEE.emit('propagate', [val, true], origFnCallWithThis, false, false)
        }
        return origFnCallWithThis;
      }
    });

    // Mirror the orig Promise's prototype (catch, try, then, etc.) but with our own methods.
    WrappedPromise.prototype = Object.create(prevPromiseObj.prototype);
    WrappedPromise.prototype.constructor = WrappedPromise; // calls to "new Promise()" should use our custom Promise
    WrappedPromise.prototype.then = function (...args) {
      var originalThis = this
      var ctx = getContext(originalThis)
      ctx.promise = originalThis
      args[0] = promiseWrapper(args[0], 'cb-', ctx, null, false)
      args[1] = promiseWrapper(args[1], 'cb-', ctx, null, false)

      const origFnCallWithThis = prevPromiseObj.prototype.then.apply(this, args);

      ctx.nextPromise = origFnCallWithThis
      promiseEE.emit('propagate', [originalThis, true], origFnCallWithThis, false, false)

      return origFnCallWithThis;
    };

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
  return promiseEE;
}
export function unwrapPromise(sharedEE) {
  const ee = scopedEE(sharedEE);
  if (wrapped[ee.debugId] === true) {
    // Since nothing about the original aka previous Promise was altered, this is simply...
    globalScope.Promise = originals.PR;
    wrapped[ee.debugId] = "unwrapped";  // keeping this map marker truthy to prevent re-wrapping by this agent (unsupported)
  }
}
export function scopedEE(sharedEE){
  return (sharedEE || baseEE).get('promise')
}
