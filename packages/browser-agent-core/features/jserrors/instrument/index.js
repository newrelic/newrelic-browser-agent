/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { handle } from '../../../common/event-emitter/handle'
import { getRuntime } from '../../../common/config/config'
import { now } from '../../../common/timing/now'
import { getOrSet } from '../../../common/util/get-or-set'
import { wrapRaf, wrapTimer, wrapEvents, wrapXhr } from '../../../common/wrap'
import slice from 'lodash._slice'
import './debug'
import { FeatureBase } from '../../../common/util/feature-base'

var NR_ERR_PROP = 'nr@seenError'

export class Instrument extends FeatureBase {
  constructor(agentIdentifier) {
    super(agentIdentifier)
    // skipNext counter to keep track of uncaught
    // errors that will be the same as caught errors.
    this.skipNext = 0
    this.handleErrors = false
    this.origOnerror = window.onerror
    
    const state = this

    const agentRuntime = getRuntime(this.agentIdentifier);
    agentRuntime.features.err = true;   // declare that we are using err instrumentation

    state.ee.on('fn-start', function (args, obj, methodName) {
      if (state.handleErrors) state.skipNext += 1
    })

    state.ee.on('fn-err', function (args, obj, err) {
      if (state.handleErrors && !err[NR_ERR_PROP]) {
        getOrSet(err, NR_ERR_PROP, function getVal() {
          return true
        })
        this.thrown = true
        notice(err, undefined, state.ee)
      }
    })

    state.ee.on('fn-end', function () {
      if (!state.handleErrors) return
      if (!this.thrown && state.skipNext > 0) state.skipNext -= 1
    })

    state.ee.on('internal-error', (e) => {
      handle('ierr', [e, now(), true], undefined, undefined, state.ee)
    })

    // Declare that we are using err instrumentation
    // require('./debug')

    const prevOnError = window.onerror
    window.onerror = (...args) => {
      if (prevOnError) prevOnError(...args)
      this.onerrorHandler(...args)
      return false
    }

    try {
      window.addEventListener('unhandledrejection', (e) => {
        this.onerrorHandler(null, null, null, null, new Error(e.reason))
      })
    } catch (err) {
      // do nothing -- addEventListener is not supported
    }

    try {
      throw new Error()
    } catch (e) {
      // Only wrap stuff if try/catch gives us useful data. It doesn't in IE < 10.
      if ('stack' in e) {
        wrapTimer(this.ee)
        wrapRaf(this.ee)

        if ('addEventListener' in window) {
          wrapEvents(this.ee)
        }

        if (agentRuntime.xhrWrappable) {
          wrapXhr(this.ee)
        }

        state.handleErrors = true
      }
    }
  }

  // FF and Android browsers do not provide error info to the 'error' event callback,
  // so we must use window.onerror
  onerrorHandler(message, filename, lineno, column, errorObj) {
    try {
      if (this.skipNext) this.skipNext -= 1
      else notice(errorObj || new UncaughtException(message, filename, lineno), true, this.ee)
    } catch (e) {
      try {
        handle('ierr', [e, now(), true], undefined, undefined, this.ee)
      } catch (err) {
        // do nothing
      }
    }

    if (typeof this.origOnerror === 'function') return this.origOnerror.apply(this, slice(arguments))
    return false
  }
}

function UncaughtException(message, filename, lineno) {
  this.message = message || 'Uncaught error with no additional information'
  this.sourceURL = filename
  this.line = lineno
}

// emits 'handle > error' event, which the error aggregator listens on
function notice(err, doNotStamp, ee) {
  // by default add timestamp, unless specifically told not to
  // this is to preserve existing behavior
  var time = (!doNotStamp) ? now() : null
  handle('err', [err, time], undefined, undefined, ee)
}
