/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import {createWrapperWithEmitter as wrapFn, wrapInPlace} from './wrap-function'
import {global as globalEE, getOrSetContext} from '../event-emitter/contextual-ee'
import {mapOwn} from '../util/map-own'
export var promiseEE = globalEE.get('promise')
var getContext = getOrSetContext
var promiseWrapper = wrapFn(promiseEE)
var OriginalPromise = NREUM.o.PR

export default promiseEE

if (OriginalPromise) {
  wrap()
}

function wrap() {
  window.Promise = WrappedPromise

  ;['all', 'race'].forEach(function (method) {
    var original = OriginalPromise[method]
    OriginalPromise[method] = function (subPromises) {
      var finalized = false
      mapOwn(subPromises, function (i, sub) {
        Promise.resolve(sub).then(setNrId(method === 'all'), setNrId(false))
      })

      var originalReturnValue = original.apply(OriginalPromise, arguments)
      var promise = OriginalPromise.resolve(originalReturnValue)

      return promise

      function setNrId (overwrite) {
        return function () {
          promiseEE.emit('propagate', [null, !finalized], originalReturnValue, false, false)
          finalized = finalized || !overwrite
        }
      }
    }
  })

  ;['resolve', 'reject'].forEach(function (method) {
    var original = OriginalPromise[method]
    OriginalPromise[method] = function (val) {
      var returnVal = original.apply(OriginalPromise, arguments)
      if (val !== returnVal) {
        promiseEE.emit('propagate', [val, true], returnVal, false, false)
      }

      return returnVal
    }
  })

  OriginalPromise.prototype['catch'] = function wrappedCatch (fn) {
    return this.then(null, fn)
  }

  Object.assign(OriginalPromise.prototype, {constructor: {value: WrappedPromise}})
  // OriginalPromise.prototype = Object.create(OriginalPromise.prototype, {
  //   constructor: {value: WrappedPromise}
  // })

  mapOwn(Object.getOwnPropertyNames(OriginalPromise), function copy (i, key) {
    try {
      WrappedPromise[key] = OriginalPromise[key]
    } catch (err) {
      // ignore properties we can't copy
    }
  })

  function WrappedPromise (executor) {
    var ctx = promiseEE.context()
    var wrappedExecutor = promiseWrapper(executor, 'executor-', ctx, null, false)

    var promise = new OriginalPromise(wrappedExecutor)

    promiseEE.context(promise).getCtx = function () {
      return ctx
    }

    return promise
  }

  wrapInPlace(OriginalPromise.prototype, 'then', function wrapThen(original) {
    return function wrappedThen() {
      var originalThis = this
      var args = wrapFn.argsToArray.apply(this, arguments)

      var ctx = getContext(originalThis)
      ctx.promise = originalThis
      args[0] = promiseWrapper(args[0], 'cb-', ctx, null, false)
      args[1] = promiseWrapper(args[1], 'cb-', ctx, null, false)

      var result = original.apply(this, args)

      ctx.nextPromise = result
      promiseEE.emit('propagate', [originalThis, true], result, false, false)

      return result
    }
  })

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
        if (val instanceof Promise) {
          var store = promiseEE.context(val)
        }

        return store && store.getCtx ? store.getCtx() : this
      }
    }
  })

  WrappedPromise.toString = function () {
    return '' + OriginalPromise
  }
}
