/**
 * Represents an uncaught non Error type error. This class does
 * not extend the Error class to prevent an invalid stack trace
 * from being created. Use this class to cast thrown errors that
 * do not use the Error class (strings, etc) to an object.
 */
export class UncaughtError {
  constructor (message, filename, lineno, colno) {
    this.name = 'UncaughtError'
    this.message = message
    this.sourceURL = filename
    this.line = lineno
    this.column = colno
  }
}
