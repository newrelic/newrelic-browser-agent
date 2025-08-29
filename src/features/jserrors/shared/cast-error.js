/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { UncaughtError } from './uncaught-error'

/**
   * Any value can be used with the `throw` keyword. This function ensures that the value is
   * either a proper Error instance or attempts to convert it to an UncaughtError instance.
   * @param {any} error The value thrown
   * @returns {Error|UncaughtError} The converted error instance
   */
export function castError (error) {
  /** Sometimes a browser can emit an error object with no stack */
  if (canTrustError(error)) {
    return error
  }

  /**
     * The thrown value may contain a message property. If it does, try to treat the thrown
     * value as an Error-like object.
     */
  return new UncaughtError(
    error?.message !== undefined ? error.message : error,
    error?.filename || error?.sourceURL,
    error?.lineno || error?.line,
    error?.colno || error?.col,
    error?.__newrelic,
    error?.cause
  )
}

/**
   * Attempts to convert a PromiseRejectionEvent object to an Error object
   * @param {PromiseRejectionEvent} unhandledRejectionEvent The unhandled promise rejection event
   * @returns {Error} An Error object with the message as the casted reason
   */
export function castPromiseRejectionEvent (promiseRejectionEvent) {
  const prefix = 'Unhandled Promise Rejection: '

  /**
   * If the casted return value is falsy like this, it will get dropped and not produce an error event for harvest.
   * We drop promise rejections that could not form a valid error stack or message deriving from the .reason attribute
   * -- such as a manually invoked rejection without an argument -- since they lack reproduction value and create confusion.
   * */
  if (!promiseRejectionEvent?.reason) return

  if (canTrustError(promiseRejectionEvent.reason)) {
    try {
      if (!promiseRejectionEvent.reason.message.startsWith(prefix)) promiseRejectionEvent.reason.message = prefix + promiseRejectionEvent.reason.message
    } catch (e) {
      // failed to modify the message, do nothing else
    }
    return castError(promiseRejectionEvent.reason)
  }

  const error = castError(promiseRejectionEvent.reason)
  if (!((error.message || '').startsWith(prefix))) error.message = prefix + error.message
  return error
}

/**
   * Attempts to convert an ErrorEvent object to an Error object
   * @param {ErrorEvent} errorEvent The error event
   * @returns {Error|UncaughtError} The error event converted to an Error object
   */
export function castErrorEvent (errorEvent) {
  if (errorEvent.error instanceof SyntaxError && !/:\d+$/.test(errorEvent.error.stack?.trim())) {
    const error = new UncaughtError(errorEvent.message, errorEvent.filename, errorEvent.lineno, errorEvent.colno, errorEvent.error.__newrelic, errorEvent.cause)
    error.name = SyntaxError.name
    return error
  }
  if (canTrustError(errorEvent.error)) return errorEvent.error
  return castError(errorEvent)
}

function canTrustError (error) {
  return error instanceof Error && !!error.stack
}
