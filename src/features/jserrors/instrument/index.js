/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { handle } from '../../../common/event-emitter/handle'
import { now } from '../../../common/timing/now'
import { getOrSet } from '../../../common/util/get-or-set'
import { wrapRaf, wrapTimer, wrapEvents, wrapXhr } from '../../../common/wrap'
import slice from 'lodash._slice'
import './debug'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, NR_ERR_PROP } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { globalScope } from '../../../common/util/global-scope'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { getRuntime } from '../../../common/config/config'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    // skipNext counter to keep track of uncaught
    // errors that will be the same as caught errors.
    this.skipNext = 0
    this.origOnerror = globalScope.onerror
    try { this.removeOnAbort = new AbortController() } // this try-catch can be removed when IE11 is completely unsupported & gone
    catch (e) {}

    const thisInstrument = this

    thisInstrument.ee.on('fn-start', function (args, obj, methodName) {
      if (thisInstrument.abortHandler) thisInstrument.skipNext += 1
    })

    thisInstrument.ee.on('fn-err', function (args, obj, err) {
      if (thisInstrument.abortHandler && !err[NR_ERR_PROP]) {
        getOrSet(err, NR_ERR_PROP, function getVal () {
          return true
        })
        this.thrown = true
        notice(err, undefined, thisInstrument.ee)
      }
    })

    thisInstrument.ee.on('fn-end', function () {
      if (!thisInstrument.abortHandler) return
      if (!this.thrown && thisInstrument.skipNext > 0) thisInstrument.skipNext -= 1
    })

    thisInstrument.ee.on('internal-error', function (e) {
      handle('ierr', [e, now(), true], undefined, FEATURE_NAMES.jserrors, thisInstrument.ee)
    })

    // Tack on our error handler onto the existing global one.
    globalScope.onerror = (...args) => {
      if (this.origOnerror) this.origOnerror(...args)
      this.onerrorHandler(...args)
      return false
    }

    globalScope.addEventListener('unhandledrejection', (e) => {
      /** rejections can contain data of any type -- this is an effort to keep the message human readable */
      const err = castReasonToError(e.reason)
      handle('err', [err, now(), false, { unhandledPromiseRejection: 1 }], undefined, FEATURE_NAMES.jserrors, this.ee)
    }, eventListenerOpts(false, this.removeOnAbort?.signal))

    wrapRaf(this.ee)
    wrapTimer(this.ee)
    wrapEvents(this.ee)
    if (getRuntime(agentIdentifier).xhrWrappable) wrapXhr(this.ee)

    this.abortHandler = this.#abort // we also use this as a flag to denote that the feature is active or on and handling errors
    this.importAggregator()
  }

  /** Restoration and resource release tasks to be done if JS error loader is being aborted. Unwind changes to globals. */
  #abort () {
    this.removeOnAbort?.abort()
    this.abortHandler = undefined // weakly allow this abort op to run only once
  }

  /**
   * FF and Android browsers do not provide error info to the 'error' event callback,
   * so we must use window.onerror
   * @param {string} message
   * @param {string} filename
   * @param {number} lineno
   * @param {number} column
   * @param {Error | *} errorObj
   * @returns
   */
  onerrorHandler (message, filename, lineno, column, errorObj) {
    try {
      if (this.skipNext) this.skipNext -= 1
      else notice(errorObj || new UncaughtException(message, filename, lineno), true, this.ee)
    } catch (e) {
      try {
        handle('ierr', [e, now(), true], undefined, FEATURE_NAMES.jserrors, this.ee)
      } catch (err) {
        // do nothing
      }
    }

    if (typeof this.origOnerror === 'function') return this.origOnerror.apply(this, slice(arguments))
    return false
  }
}

/**
 *
 * @param {string} message
 * @param {string} filename
 * @param {number} lineno
 */
function UncaughtException (message, filename, lineno) {
  this.message = message || 'Uncaught error with no additional information'
  this.sourceURL = filename
  this.line = lineno
}

/**
 * Adds a timestamp and emits the 'err' event, which the error aggregator listens for
 * @param {Error} err
 * @param {boolean} doNotStamp
 * @param {ContextualEE} ee
 */
function notice (err, doNotStamp, ee) {
  // by default add timestamp, unless specifically told not to
  // this is to preserve existing behavior
  var time = (!doNotStamp) ? now() : null
  handle('err', [err, time], undefined, FEATURE_NAMES.jserrors, ee)
}

/**
 * Attempts to cast an unhandledPromiseRejection reason (reject(...)) to an Error object
 * @param {*} reason - The reason property from an unhandled promise rejection
 * @returns {Error} - An Error object with the message as the casted reason
 */
function castReasonToError (reason) {
  let prefix = 'Unhandled Promise Rejection: '
  if (reason instanceof Error) {
    try {
      reason.message = prefix + reason.message
      return reason
    } catch (e) {
      return reason
    }
  }
  if (typeof reason === 'undefined') return new Error(prefix)
  try {
    return new Error(prefix + JSON.stringify(reason))
  } catch (err) {
    return new Error(prefix)
  }
}
