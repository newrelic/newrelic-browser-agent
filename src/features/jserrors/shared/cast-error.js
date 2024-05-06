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
  if (typeof error?.message !== 'undefined') {
    return new UncaughtError(
      error.message,
      error.filename || error.sourceURL,
      error.lineno || error.line,
      error.colno || error.col,
      error.__newrelic
    )
  }

  return new UncaughtError(error)
}

/**
   * Attempts to convert a PromiseRejectionEvent object to an Error object
   * @param {PromiseRejectionEvent} unhandledRejectionEvent The unhandled promise rejection event
   * @returns {Error} An Error object with the message as the casted reason
   */
export function castPromiseRejectionEvent (promiseRejectionEvent) {
  let prefix = 'Unhandled Promise Rejection: '

  if (promiseRejectionEvent?.reason instanceof Error) {
    try {
      promiseRejectionEvent.reason.message = prefix + promiseRejectionEvent.reason.message
    } catch (e) {
    }
  }

  if (typeof promiseRejectionEvent.reason === 'undefined') return castError(prefix)

  const error = castError(promiseRejectionEvent.reason)
  error.message = prefix + error.message
  return error
}

/**
   * Attempts to convert an ErrorEvent object to an Error object
   * @param {ErrorEvent} errorEvent The error event
   * @returns {Error|UncaughtError} The error event converted to an Error object
   */
export function castErrorEvent (errorEvent) {
  if (errorEvent.error instanceof SyntaxError && !/:\d+$/.test(errorEvent.error.stack?.trim())) {
    const error = new UncaughtError(errorEvent.message, errorEvent.filename, errorEvent.lineno, errorEvent.colno)
    error.name = SyntaxError.name
    return error
  }
  if (canTrustError(errorEvent.error)) return errorEvent.error
  return castError(errorEvent.error || errorEvent)
}

function canTrustError (error) {
  return error instanceof Error && !!error.stack
}
