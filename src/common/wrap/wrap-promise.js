/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Wraps the native Promise object for instrumentation.
 * This module is used by: spa.
 */

import { ee as baseEE } from '../event-emitter/contextual-ee'
import { globalScope } from '../constants/runtime'

// const wrapped = {}

/**
 * Wraps the native Promise object so that it will emit events for start, end and error in the context of a new event
 * emitter scoped only to promise methods. Also instruments various methods, such as `all`, `race`, `resolve`,
 * `reject`, `then`, and `catch`.
 * @param {Object} sharedEE - The shared event emitter on which a new scoped event emitter will be based.
 * @returns {Object} Scoped event emitter with a debug ID of `promise`.
 */
export const wrapPromise = (sharedEE = baseEE) => {
  if (sharedEE.hasChildEmitter('promise')) {
    return sharedEE.get('promise')
  }

  const promiseEE = sharedEE.get('promise')
  const promiseGlobal = globalScope.Promise

  if (!promiseGlobal) {
    return promiseEE
  }

  const nrWrapper = class extends promiseGlobal {
    ctx
    constructor (executor) {
      let executorContext

      let wrappedExecutor
      if (executor) {
        wrappedExecutor = function nrWrapper () {
          const args = [...arguments]
          executorContext = promiseEE.context(this)
          promiseEE.emit('executor-start', [args, this, executor.name], executorContext, false)

          let result
          try {
            result = executor.apply(this, args)
            return result
          } catch (err) {
            promiseEE.emit('executor-err', [args, this, err], executorContext, false)
            throw err
          } finally {
            promiseEE.emit('executor-end', [args, this, result], executorContext, false)
          }
        }
      }

      super(wrappedExecutor || executor)

      this.ctx = executorContext
    }

    static resolve (value) {
      const superValue = super.resolve(value)

      if (value !== superValue) {
        promiseEE.emit('propagate', [value, true], superValue, false, false)
      }

      return superValue
    }

    static reject (value) {
      const superValue = super.reject(value)

      if (value !== superValue) {
        promiseEE.emit('propagate', [value, true], superValue, false, false)
      }

      return superValue
    }

    static all (iterable) {
      return super.all(iterable)
    }

    static race (iterable) {
      return super.race(iterable)
    }

    static toString () {
      // Force toString return value to appear native to JS libraries
      return '[native code]'
    }

    static get name () {
      return 'Promise'
    }

    then (resolve, reject) {
      const self = this

      let wrappedResolve
      if (resolve) {
        wrappedResolve = function nrWrapper () {
          const args = [...arguments]
          promiseEE.emit('cb-start', [args, this, resolve.name], self.ctx, false)

          let result
          try {
            result = resolve.apply(this, args)
            return result
          } catch (err) {
            promiseEE.emit('cb-err', [args, this, err], self.ctx, false)
            throw err
          } finally {
            promiseEE.emit('cb-end', [args, this, result], self.ctx, false)
          }
        }
      }

      let wrappedReject
      if (reject) {
        wrappedReject = function nrWrapper () {
          const args = [...arguments]
          promiseEE.emit('cb-start', [args, this, reject.name], self.ctx, false)

          let result
          try {
            result = reject.apply(this, args)
            return result
          } catch (err) {
            promiseEE.emit('cb-err', [args, this, err], self.ctx, false)
            throw err
          } finally {
            promiseEE.emit('cb-end', [args, this, result], self.ctx, false)
          }
        }
      }

      return super.then(wrappedResolve, wrappedReject)
    }
  }

  if (typeof Symbol !== 'undefined' && typeof Symbol.hasInstance === 'symbol') {
    Object.defineProperty(nrWrapper.prototype.constructor, Symbol.hasInstance, {
      value: function (instance) {
        return instance instanceof promiseGlobal
      }
    })
  }

  globalScope.Promise = nrWrapper

  return promiseEE
}
