/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var handle = require('nr-browser-common').handle.global
var slice = require('lodash._slice')
var ee = require('nr-browser-common').ee.global
var config = require('nr-browser-common').config
var now = require('nr-browser-common').now
var getOrSet = require('nr-browser-common').getOrSet
var wrap = require('nr-browser-common').wrap
var origOnerror = window.onerror
var handleErrors = false
var NR_ERR_PROP = 'nr@seenError'

// skipNext counter to keep track of uncaught
// errors that will be the same as caught errors.
var skipNext = 0

// Declare that we are using err instrumentation
require('./debug')

window.onerror = onerrorHandler

try {
  throw new Error()
} catch (e) {
  // Only wrap stuff if try/catch gives us useful data. It doesn't in IE < 10.
  if ('stack' in e) {
    wrap('timer')
    wrap('raf')

    if ('addEventListener' in window) {
      wrap('events')
    }

    if (config.runtime.xhrWrappable) {
      wrap('xhr')
    }

    handleErrors = true
  }
}

ee.on('fn-start', function (args, obj, methodName) {
  if (handleErrors) skipNext += 1
})

ee.on('fn-err', function (args, obj, err) {
  if (handleErrors && !err[NR_ERR_PROP]) {
    getOrSet(err, NR_ERR_PROP, function getVal () {
      return true
    })
    this.thrown = true
    notice(err)
  }
})

ee.on('fn-end', function () {
  if (!handleErrors) return
  if (!this.thrown && skipNext > 0) skipNext -= 1
})

ee.on('internal-error', function (e) {
  handle('ierr', [e, now(), true])
})

// FF and Android browsers do not provide error info to the 'error' event callback,
// so we must use window.onerror
function onerrorHandler (message, filename, lineno, column, errorObj) {
  try {
    if (skipNext) skipNext -= 1
    else notice(errorObj || new UncaughtException(message, filename, lineno), true)
  } catch (e) {
    try {
      handle('ierr', [e, now(), true])
    } catch (err) {
    }
  }

  if (typeof origOnerror === 'function') return origOnerror.apply(this, slice(arguments))
  return false
}

function UncaughtException (message, filename, lineno) {
  this.message = message || 'Uncaught error with no additional information'
  this.sourceURL = filename
  this.line = lineno
}

// emits 'handle > error' event, which the error aggregator listens on
function notice (err, doNotStamp) {
  // by default add timestamp, unless specifically told not to
  // this is to preserve existing behavior
  var time = (!doNotStamp) ? now() : null
  handle('err', [err, time])
}
