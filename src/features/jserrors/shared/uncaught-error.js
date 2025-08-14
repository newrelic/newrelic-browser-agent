/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { stringify } from '../../../common/util/stringify'

/**
 * Represents an uncaught non Error type error. This class does
 * not extend the Error class to prevent an invalid stack trace
 * from being created. Use this class to cast thrown errors that
 * do not use the Error class (strings, etc) to an object.
 */
export class UncaughtError {
  constructor (message, filename, lineno, colno, newrelic, cause) {
    this.name = 'UncaughtError'
    this.message = typeof message === 'string' ? message : stringify(message)
    this.sourceURL = filename
    this.line = lineno
    this.column = colno
    this.__newrelic = newrelic
    this.cause = cause
  }
}
